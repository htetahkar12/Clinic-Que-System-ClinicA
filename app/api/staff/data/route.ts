import { NextResponse } from "next/server";
import { getAdmin, rpcErrorCode } from "@/lib/server/supabase-admin";
import { isStaffRequest } from "@/lib/server/staff-auth";
import { clinicToday } from "@/lib/date";

export const dynamic = "force-dynamic";

/**
 * Staff-only data that the anon key cannot read:
 * patient names/phones for active bookings and payment transactions (receipts).
 */
export async function GET() {
  if (!isStaffRequest()) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const admin = getAdmin();
    const today = clinicToday();
    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, patient_id")
      .or(`booking_date.gte.${today},payment_status.eq.pending`)
      .limit(3000);
    if (error) throw error;

    const bookingIds = (bookings || []).map((b) => b.id);
    const patientIds = Array.from(new Set((bookings || []).map((b) => b.patient_id)));

    const [{ data: patients }, { data: transactions }] = await Promise.all([
      patientIds.length
        ? admin.from("patients").select("id, phone, name, credit_points").in("id", patientIds)
        : Promise.resolve({ data: [] as unknown[] }),
      bookingIds.length
        ? admin
            .from("transactions")
            .select("id, patient_id, booking_id, amount, payment_method, receipt_image_url, type, created_at")
            .in("booking_id", bookingIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    return NextResponse.json({ ok: true, patients: patients || [], transactions: transactions || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: rpcErrorCode(e) }, { status: 500 });
  }
}
