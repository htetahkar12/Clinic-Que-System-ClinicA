import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/** Service-role Supabase client. NEVER import this from client components. */
export function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Maps Postgres RPC exception codes to user-friendly error keys. */
export function rpcErrorCode(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : String(err);
  const known = [
    "DOCTOR_NOT_FOUND",
    "DOCTOR_UNAVAILABLE",
    "DOCTOR_FULL",
    "PATIENT_NOT_FOUND",
    "ALREADY_BOOKED",
    "INSUFFICIENT_POINTS",
    "INVALID_PAYMENT_METHOD",
    "BOOKING_NOT_FOUND",
    "INVALID_STATE",
    "INVALID_DATE",
    "INVALID_NUMBER",
    "OTP_TOO_SOON",
    "CODE_EXPIRED",
    "INVALID_CODE",
    "TOO_MANY_ATTEMPTS",
    "SMS_FAILED",
  ];
  const found = known.find((k) => msg.includes(k));
  if (found) return found;
  if (msg.includes("schema cache") || msg.includes("does not exist")) return "DB_NOT_READY";
  return msg || "UNKNOWN_ERROR";
}
