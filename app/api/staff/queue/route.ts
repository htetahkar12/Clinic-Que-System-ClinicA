import { NextRequest, NextResponse } from "next/server";
import { getAdmin, rpcErrorCode } from "@/lib/server/supabase-admin";
import { isStaffRequest } from "@/lib/server/staff-auth";
import { runQueueAutomations, getDoctor, toMessage } from "@/lib/server/automations";
import { dispatchMessages } from "@/lib/server/notify";
import { attachTicketQr, appBaseUrl } from "@/lib/server/ticket";
import { templates } from "@/lib/messages";
import { isValidMyanmarPhone, normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function bookingInfo(bookingId: string) {
  const { data } = await getAdmin()
    .from("bookings")
    .select("id, patient_id, doctor_id, queue_number, status, payment_status, booking_date")
    .eq("id", bookingId)
    .maybeSingle();
  return data;
}

/** Reception / doctor queue actions. */
export async function POST(req: NextRequest) {
  if (!isStaffRequest()) return fail("UNAUTHORIZED", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  const admin = getAdmin();

  try {
    switch (action) {
      // [Next Patient]
      case "next": {
        const doctorId = String(body.doctorId);
        const { data, error } = await admin.rpc("advance_doctor_queue", { p_doctor_id: doctorId });
        if (error) return fail(rpcErrorCode(error));
        const r = data as { has_next: boolean; booking_id?: string; queue_number?: number };
        await runQueueAutomations(doctorId, r.booking_id);
        return NextResponse.json({ ok: true, result: r });
      }

      // Call a specific patient now (skip ahead / bring back a no-show)
      case "call": {
        const { data, error } = await admin.rpc("call_booking", { p_booking_id: String(body.bookingId) });
        if (error) return fail(rpcErrorCode(error));
        const r = data as { doctor_id: string; booking_id: string };
        await runQueueAutomations(r.doctor_id, r.booking_id);
        return NextResponse.json({ ok: true, result: r });
      }

      // Re-send "please come in" to the patient currently called
      case "recall": {
        const b = await bookingInfo(String(body.bookingId));
        if (!b) return fail("BOOKING_NOT_FOUND", 404);
        const doc = await getDoctor(b.doctor_id);
        if (doc) await dispatchMessages([toMessage(templates.recall(doc, b.queue_number), { booking_id: b.id, patient_id: b.patient_id })]);
        return NextResponse.json({ ok: true });
      }

      case "no_show": {
        const b = await bookingInfo(String(body.bookingId));
        if (!b) return fail("BOOKING_NOT_FOUND", 404);
        if (!["waiting", "in_progress"].includes(b.status)) return fail("INVALID_STATE");
        await admin.from("bookings").update({ status: "no_show", updated_at: new Date().toISOString() }).eq("id", b.id);
        await runQueueAutomations(b.doctor_id);
        return NextResponse.json({ ok: true });
      }

      case "check_in": {
        await admin.from("bookings").update({ checked_in_at: new Date().toISOString() }).eq("id", String(body.bookingId));
        return NextResponse.json({ ok: true });
      }

      // Manual override: set today's "now serving" / custom starting number
      case "set_number": {
        const num = Math.floor(Number(body.number));
        if (!Number.isFinite(num) || num < 0 || num > 9999) return fail("INVALID_NUMBER");
        const { error } = await admin.rpc("set_doctor_queue", { p_doctor_id: String(body.doctorId), p_number: num });
        if (error) return fail(rpcErrorCode(error));
        return NextResponse.json({ ok: true });
      }

      // Walk-in / VIP patient added at the desk (cash or points)
      case "walk_in": {
        const phone = normalizePhone(String(body.phone || ""));
        const name = String(body.name || "").trim().slice(0, 80);
        if (!isValidMyanmarPhone(phone)) return fail("INVALID_PHONE");
        const doctorId = String(body.doctorId);
        const method = body.paymentMethod === "credit_points" ? "credit_points" : "cash";

        let { data: patient } = await admin.from("patients").select("id").eq("phone", phone).maybeSingle();
        if (!patient) {
          if (!name) return fail("NAME_REQUIRED");
          const { data, error } = await admin.from("patients").insert({ phone, name }).select("id").single();
          if (error) throw error;
          patient = data;
        }
        const { data, error } = await admin.rpc("create_booking", {
          p_patient_id: patient!.id,
          p_doctor_id: doctorId,
          p_payment_method: method,
          p_receipt_url: null,
          p_source: "walk_in",
          p_priority: Boolean(body.vip),
        });
        if (error) return fail(rpcErrorCode(error));
        const booking = data as { id: string; ticket_code: string };
        const qr = await attachTicketQr(booking.id, booking.ticket_code, appBaseUrl(req));
        await runQueueAutomations(doctorId);
        return NextResponse.json({ ok: true, booking: { ...booking, qr_image_url: qr } });
      }

      case "verify_payment": {
        const b = await bookingInfo(String(body.bookingId));
        if (!b) return fail("BOOKING_NOT_FOUND", 404);
        if (b.payment_status !== "pending") return fail("INVALID_STATE");
        await admin.from("bookings").update({ payment_status: "paid", updated_at: new Date().toISOString() }).eq("id", b.id);
        const doc = await getDoctor(b.doctor_id);
        if (doc) await dispatchMessages([toMessage(templates.paymentVerified(doc, b.queue_number), { booking_id: b.id, patient_id: b.patient_id })]);
        await runQueueAutomations(b.doctor_id);
        return NextResponse.json({ ok: true });
      }

      case "reject_payment": {
        const { data, error } = await admin.rpc("cancel_booking", { p_booking_id: String(body.bookingId), p_reject: true });
        if (error) return fail(rpcErrorCode(error));
        const r = data as { doctor_id: string; queue_number: number; patient_id: string; booking_id: string };
        const doc = await getDoctor(r.doctor_id);
        if (doc) await dispatchMessages([toMessage(templates.paymentRejected(doc, r.queue_number), { booking_id: r.booking_id, patient_id: r.patient_id })]);
        await runQueueAutomations(r.doctor_id);
        return NextResponse.json({ ok: true, result: r });
      }

      // Cancel => paid amount becomes credit points (no cash refunds)
      case "cancel": {
        const { data, error } = await admin.rpc("cancel_booking", { p_booking_id: String(body.bookingId), p_reject: false });
        if (error) return fail(rpcErrorCode(error));
        const r = data as { doctor_id: string; queue_number: number; patient_id: string; booking_id: string; refunded_amount: number };
        const doc = await getDoctor(r.doctor_id);
        if (doc) {
          await dispatchMessages([
            toMessage(templates.bookingCancelled(doc, r.queue_number, Number(r.refunded_amount)), { booking_id: r.booking_id, patient_id: r.patient_id }),
          ]);
        }
        await runQueueAutomations(r.doctor_id);
        return NextResponse.json({ ok: true, result: r });
      }

      default:
        return fail("UNKNOWN_ACTION");
    }
  } catch (e) {
    return fail(rpcErrorCode(e), 500);
  }
}
