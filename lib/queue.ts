import type { Booking, Doctor } from "@/lib/types";
import { clinicToday, effectiveDoctorStatus } from "@/lib/date";
import { NEAR_TURN_THRESHOLD } from "@/clinic.config";

/** Queue order used everywhere (must match the SQL): VIP first, then number. */
export function queueOrder(a: Booking, b: Booking): number {
  return Number(b.is_priority) - Number(a.is_priority) || a.queue_number - b.queue_number;
}

export function waitingList(bookings: Booking[], doctorId: string, date = clinicToday()): Booking[] {
  return bookings
    .filter((b) => b.doctor_id === doctorId && b.booking_date === date && b.status === "waiting")
    .sort(queueOrder);
}

export function inProgress(bookings: Booking[], doctorId: string, date = clinicToday()): Booking | undefined {
  return bookings.find((b) => b.doctor_id === doctorId && b.booking_date === date && b.status === "in_progress");
}

export function todaysCount(bookings: Booking[], doctorId: string): number {
  const today = clinicToday();
  return bookings.filter((b) => b.doctor_id === doctorId && b.booking_date === today && b.status !== "cancelled").length;
}

export type TicketState = "your_turn" | "near" | "waiting" | "done" | "cancelled" | "no_show" | "future";

export interface TicketInfo {
  state: TicketState;
  ahead: number;
  etaMinutes: number;
}

export function ticketInfo(booking: Booking, bookings: Booking[], doctor: Doctor | undefined): TicketInfo {
  const today = clinicToday();
  if (booking.status === "cancelled") return { state: "cancelled", ahead: 0, etaMinutes: 0 };
  if (booking.status === "completed") return { state: "done", ahead: 0, etaMinutes: 0 };
  if (booking.status === "no_show") return { state: "no_show", ahead: 0, etaMinutes: 0 };
  if (booking.booking_date > today) return { state: "future", ahead: 0, etaMinutes: 0 };
  if (booking.status === "in_progress") return { state: "your_turn", ahead: 0, etaMinutes: 0 };

  const list = waitingList(bookings, booking.doctor_id, booking.booking_date);
  const idx = Math.max(0, list.findIndex((b) => b.id === booking.id));
  const avg = doctor?.avg_consult_minutes || 10;
  const someoneInRoom = Boolean(inProgress(bookings, booking.doctor_id));
  const delay = doctor && effectiveDoctorStatus(doctor) === "delayed" ? doctor.delay_minutes : 0;
  const etaMinutes = Math.round((idx + (someoneInRoom ? 0.5 : 0)) * avg + delay);
  return { state: idx < NEAR_TURN_THRESHOLD ? "near" : "waiting", ahead: idx, etaMinutes };
}

/** Rough wait for a NEW booking with this doctor right now. */
export function estimatedWaitForNew(bookings: Booking[], doctor: Doctor): number {
  const waiting = waitingList(bookings, doctor.id).length;
  const delay = effectiveDoctorStatus(doctor) === "delayed" ? doctor.delay_minutes : 0;
  return waiting * (doctor.avg_consult_minutes || 10) + delay;
}

export function nextQueueNumber(bookings: Booking[], doctor: Doctor): number {
  const today = clinicToday();
  const max = bookings
    .filter((b) => b.doctor_id === doctor.id && b.booking_date === today)
    .reduce((m, b) => Math.max(m, b.queue_number), doctor.queue_date === today ? doctor.current_queue_number : 0);
  return max + 1;
}
