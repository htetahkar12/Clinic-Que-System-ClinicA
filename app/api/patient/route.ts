import { NextRequest, NextResponse } from "next/server";
import { getAdmin, rpcErrorCode } from "@/lib/server/supabase-admin";
import { attachTicketQr, appBaseUrl } from "@/lib/server/ticket";
import { PATIENT_COOKIE, getPatientId } from "@/lib/server/staff-auth";
import { runQueueAutomations, getDoctor, toMessage } from "@/lib/server/automations";
import { dispatchMessages } from "@/lib/server/notify";
import { templates } from "@/lib/messages";

export const dynamic = "force-dynamic";

const PATIENT_FIELDS = "id, phone, name, credit_points, fcm_token, preferred_language, created_at";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** GET = current signed-in patient (from httpOnly cookie) + recent transactions. */
export async function GET() {
  const patientId = getPatientId();
  if (!patientId) return NextResponse.json({ ok: true, patient: null });
  try {
    const admin = getAdmin();
    const { data: patient } = await admin.from("patients").select(PATIENT_FIELDS).eq("id", patientId).maybeSingle();
    if (!patient) return NextResponse.json({ ok: true, patient: null });
    const { data: transactions } = await admin
      .from("transactions")
      .select("id, booking_id, amount, payment_method, type, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20);
    return NextResponse.json({ ok: true, patient, transactions: transactions || [] });
  } catch (e) {
    return fail(rpcErrorCode(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PATIENT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const patientId = getPatientId();
  if (!patientId) return fail("NOT_SIGNED_IN", 401);

  try {
    const admin = getAdmin();

    if (action === "update") {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.lang === "en" || body.lang === "my") updates.preferred_language = body.lang;
      if (typeof body.fcmToken === "string" && body.fcmToken) updates.fcm_token = body.fcmToken;
      if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 80);
      const { data, error } = await admin.from("patients").update(updates).eq("id", patientId).select(PATIENT_FIELDS).single();
      if (error) throw error;
      return NextResponse.json({ ok: true, patient: data });
    }

    if (action === "book") {
      const doctorId = String(body.doctorId || "");
      const method = String(body.paymentMethod || "");
      if (!["kpay", "wavepay", "ayapay", "credit_points"].includes(method)) return fail("INVALID_PAYMENT_METHOD");
      const receiptUrl = typeof body.receiptUrl === "string" ? body.receiptUrl : null;
      if (method !== "credit_points" && !receiptUrl) return fail("RECEIPT_REQUIRED");

      const { data, error } = await admin.rpc("create_booking", {
        p_patient_id: patientId,
        p_doctor_id: doctorId,
        p_payment_method: method,
        p_receipt_url: receiptUrl,
        p_source: "online",
        p_priority: false,
      });
      if (error) return fail(rpcErrorCode(error));
      const booking = data as { id: string; ticket_code: string };
      const qr = await attachTicketQr(booking.id, booking.ticket_code, appBaseUrl(req));
      await runQueueAutomations(doctorId);
      return NextResponse.json({ ok: true, booking: { ...booking, qr_image_url: qr } });
    }

    if (action === "cancel") {
      const bookingId = String(body.bookingId || "");
      const { data: b } = await admin.from("bookings").select("patient_id, status").eq("id", bookingId).maybeSingle();
      if (!b || b.patient_id !== patientId) return fail("BOOKING_NOT_FOUND", 404);
      if (b.status !== "waiting") return fail("INVALID_STATE");

      const { data, error } = await admin.rpc("cancel_booking", { p_booking_id: bookingId, p_reject: false });
      if (error) return fail(rpcErrorCode(error));
      const result = data as { doctor_id: string; queue_number: number; refunded_amount: number };
      const doc = await getDoctor(result.doctor_id);
      if (doc) {
        await dispatchMessages([
          toMessage(templates.bookingCancelled(doc, result.queue_number, Number(result.refunded_amount)), {
            booking_id: bookingId,
            patient_id: patientId,
          }),
        ]);
      }
      await runQueueAutomations(result.doctor_id);
      return NextResponse.json({ ok: true, result });
    }

    return fail("UNKNOWN_ACTION");
  } catch (e) {
    return fail(rpcErrorCode(e), 500);
  }
}
