import "server-only";
import { getAdmin } from "@/lib/server/supabase-admin";
import { dispatchMessages } from "@/lib/server/notify";
import { templates } from "@/lib/messages";
import { clinicToday } from "@/lib/date";
import { NEAR_TURN_THRESHOLD } from "@/clinic.config";
import type { Doctor, MessageInsert } from "@/lib/types";

export async function getDoctor(doctorId: string): Promise<Doctor | null> {
  const { data } = await getAdmin().from("doctors").select("*").eq("id", doctorId).maybeSingle();
  return (data as Doctor) || null;
}

function toMessage(
  t: ReturnType<(typeof templates)[keyof typeof templates]>,
  target: Partial<Pick<MessageInsert, "doctor_id" | "booking_id" | "patient_id">>,
  kind: "manual" | "automated" = "automated"
): MessageInsert {
  return {
    doctor_id: target.doctor_id ?? null,
    booking_id: target.booking_id ?? null,
    patient_id: target.patient_id ?? null,
    kind,
    ...t,
  };
}

/**
 * Automated alerts after any queue change for a doctor:
 *  - "It's your turn" for the newly called patient
 *  - "Your turn is near" (once) for everyone within NEAR_TURN_THRESHOLD places
 */
export async function runQueueAutomations(doctorId: string, calledBookingId?: string | null) {
  try {
    const admin = getAdmin();
    const doc = await getDoctor(doctorId);
    if (!doc) return;
    const messages: MessageInsert[] = [];

    if (calledBookingId) {
      const { data: called } = await admin
        .from("bookings")
        .select("id, patient_id, queue_number")
        .eq("id", calledBookingId)
        .maybeSingle();
      if (called) {
        messages.push(toMessage(templates.yourTurn(doc, called.queue_number), { booking_id: called.id, patient_id: called.patient_id }));
      }
    }

    const { data: waiting } = await admin
      .from("bookings")
      .select("id, patient_id, queue_number, notified_near_at, is_priority")
      .eq("doctor_id", doctorId)
      .eq("booking_date", clinicToday())
      .eq("status", "waiting")
      .order("is_priority", { ascending: false })
      .order("queue_number", { ascending: true })
      .limit(NEAR_TURN_THRESHOLD + 1);

    const toFlag: string[] = [];
    (waiting || []).slice(0, NEAR_TURN_THRESHOLD).forEach((b, idx) => {
      if (!b.notified_near_at) {
        messages.push(toMessage(templates.turnNear(doc, b.queue_number, idx), { booking_id: b.id, patient_id: b.patient_id }));
        toFlag.push(b.id);
      }
    });

    if (toFlag.length) {
      await admin.from("bookings").update({ notified_near_at: new Date().toISOString() }).in("id", toFlag);
    }
    await dispatchMessages(messages);
  } catch {
    // automations must never break the main staff action
  }
}

export { toMessage };
