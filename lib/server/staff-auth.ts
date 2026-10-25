import "server-only";
import { cookies } from "next/headers";
import { safeEqual, signToken, verifyToken } from "@/lib/server/session";

export const STAFF_COOKIE = "clinic_staff_session";
export const PATIENT_COOKIE = "clinic_patient_session";
const STAFF_MAX_AGE = 12 * 3600; // 12 hours (one shift)
const PATIENT_MAX_AGE = 90 * 24 * 3600; // 90 days — elderly patients should not need to log in often

export function verifyPin(pin: string): boolean {
  return safeEqual(String(pin || ""), process.env.STAFF_PIN || "1234");
}

export function createStaffToken() {
  return { token: signToken("staff", STAFF_MAX_AGE), maxAge: STAFF_MAX_AGE };
}

export function createPatientToken(patientId: string) {
  return { token: signToken(`patient:${patientId}`, PATIENT_MAX_AGE), maxAge: PATIENT_MAX_AGE };
}

export function isStaffRequest(): boolean {
  return verifyToken(cookies().get(STAFF_COOKIE)?.value) === "staff";
}

/** Returns the signed-in patient's id (from the httpOnly cookie) or null. */
export function getPatientId(): string | null {
  const payload = verifyToken(cookies().get(PATIENT_COOKIE)?.value);
  return payload?.startsWith("patient:") ? payload.slice(8) : null;
}

export const cookieOptions = (maxAge: number) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge,
});
