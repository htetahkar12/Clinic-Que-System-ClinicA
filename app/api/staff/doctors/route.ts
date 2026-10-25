import { NextRequest, NextResponse } from "next/server";
import { getAdmin, rpcErrorCode } from "@/lib/server/supabase-admin";
import { isStaffRequest } from "@/lib/server/staff-auth";
import { getDoctor, toMessage } from "@/lib/server/automations";
import { dispatchMessages } from "@/lib/server/notify";
import { templates } from "@/lib/messages";
import { clinicToday } from "@/lib/date";
import type { MessageInsert } from "@/lib/types";

export const dynamic = "force-dynamic";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function sanitizeDoctor(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const str = (k: string, max = 120) => {
    if (typeof input[k] === "string") out[k] = (input[k] as string).trim().slice(0, max);
  };
  const optStr = (k: string, max = 120) => {
    if (typeof input[k] === "string") out[k] = (input[k] as string).trim().slice(0, max) || null;
  };
  const num = (k: string, min: number, max: number) => {
    if (input[k] !== undefined && input[k] !== "") {
      const v = Number(input[k]);
      if (Number.isFinite(v)) out[k] = Math.min(max, Math.max(min, Math.round(v)));
    }
  };
  str("name");
  optStr("name_my");
  str("specialty");
  optStr("specialty_my");
  str("room_number", 30);
  num("consultation_fee", 0, 10_000_000);
  num("max_patients", 1, 500);
  num("avg_consult_minutes", 1, 180);
  num("sort_order", 0, 999);
  if (typeof input.start_time === "string" && TIME_RE.test(input.start_time)) out.start_time = input.start_time;
  if (typeof input.end_time === "string" && TIME_RE.test(input.end_time)) out.end_time = input.end_time;
  if (typeof input.is_active === "boolean") out.is_active = input.is_active;
  return out;
}

/** Doctor management: add / edit / remove, and today's status (arrived, delayed, postponed, cancelled). */
export async function POST(req: NextRequest) {
  if (!isStaffRequest()) return fail("UNAUTHORIZED", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  const admin = getAdmin();
  const doctorId = String(body.doctorId || "");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;

  try {
    switch (action) {
      case "create": {
        const fields = sanitizeDoctor((body.doctor as Record<string, unknown>) || {});
        if (!fields.name || !fields.specialty || !fields.room_number) return fail("MISSING_FIELDS");
        const { data, error } = await admin.from("doctors").insert(fields).select("*").single();
        if (error) throw error;
        return NextResponse.json({ ok: true, doctor: data });
      }

      case "update": {
        const fields = sanitizeDoctor((body.doctor as Record<string, unknown>) || {});
        if (fields.name === "" || fields.specialty === "" || fields.room_number === "") return fail("MISSING_FIELDS");
        const { data, error } = await admin
          .from("doctors")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", doctorId)
          .select("*")
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, doctor: data });
      }

      // "Remove" = archive (keeps booking & payment history intact)
      case "archive": {
        const { count } = await admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("doctor_id", doctorId)
          .gte("booking_date", clinicToday())
          .in("status", ["waiting", "in_progress"]);
        if ((count || 0) > 0) return fail("HAS_ACTIVE_BOOKINGS");
        await admin.from("doctors").update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() }).eq("id", doctorId);
        return NextResponse.json({ ok: true });
      }

      case "set_available": {
        await admin
          .from("doctors")
          .update({ status: "available", status_date: clinicToday(), delay_minutes: 0, status_note: null, postponed_to: null, updated_at: new Date().toISOString() })
          .eq("id", doctorId);
        const doc = await getDoctor(doctorId);
        if (doc && body.notify !== false) await dispatchMessages([toMessage(templates.available(doc), { doctor_id: doctorId })]);
        return NextResponse.json({ ok: true });
      }

      case "set_delay": {
        const minutes = Math.min(600, Math.max(5, Math.round(Number(body.minutes) || 15)));
        await admin
          .from("doctors")
          .update({ status: "delayed", status_date: clinicToday(), delay_minutes: minutes, status_note: note, updated_at: new Date().toISOString() })
          .eq("id", doctorId);
        const doc = await getDoctor(doctorId);
        if (doc) await dispatchMessages([toMessage(templates.delay(doc, minutes, note), { doctor_id: doctorId })]);
        return NextResponse.json({ ok: true });
      }

      case "postpone": {
        const newDate = String(body.newDate || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return fail("INVALID_DATE");
        const { data, error } = await admin.rpc("postpone_doctor_session", { p_doctor_id: doctorId, p_new_date: newDate, p_note: note });
        if (error) return fail(rpcErrorCode(error));
        const moved = ((data as { moved: Array<{ booking_id: string; patient_id: string; new_queue_number: number }> }).moved || []);
        const doc = await getDoctor(doctorId);
        if (doc) {
          await dispatchMessages(
            moved.map((m) =>
              toMessage(templates.postponed(doc, newDate, m.new_queue_number, note), { booking_id: m.booking_id, patient_id: m.patient_id })
            )
          );
        }
        return NextResponse.json({ ok: true, moved: moved.length });
      }

      case "cancel_session": {
        const { data, error } = await admin.rpc("cancel_doctor_session", { p_doctor_id: doctorId, p_note: note });
        if (error) return fail(rpcErrorCode(error));
        const cancelled = ((data as { cancelled: Array<{ booking_id: string; patient_id: string; refunded_amount: number }> }).cancelled || []);
        const doc = await getDoctor(doctorId);
        if (doc) {
          const msgs: MessageInsert[] = cancelled.map((c) =>
            toMessage(templates.sessionCancelled(doc, Number(c.refunded_amount), note), { booking_id: c.booking_id, patient_id: c.patient_id })
          );
          await dispatchMessages(msgs);
        }
        return NextResponse.json({ ok: true, cancelled: cancelled.length });
      }

      default:
        return fail("UNKNOWN_ACTION");
    }
  } catch (e) {
    return fail(rpcErrorCode(e), 500);
  }
}
