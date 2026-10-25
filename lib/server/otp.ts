import "server-only";
import crypto from "crypto";
import { getAdmin } from "@/lib/server/supabase-admin";
import { hashSecret, safeEqual } from "@/lib/server/session";
import { CLINIC_NAME } from "@/clinic.config";

const CODE_TTL_MS = 5 * 60_000;
const RESEND_AFTER_MS = 45_000;
const MAX_ATTEMPTS = 5;

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_TOKEN);
}

/** Demo mode shows the code on screen. Turn OFF in production (OTP_DEMO_MODE=false). */
export function isOtpDemoMode(): boolean {
  return process.env.OTP_DEMO_MODE !== "false" && !isSmsConfigured();
}

/**
 * Generic SMS gateway hook. Works with most Myanmar bulk-SMS providers that
 * accept a JSON POST with a bearer token. Adjust the body to your provider.
 */
async function sendSms(to: string, message: string) {
  const res = await fetch(process.env.SMS_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SMS_API_TOKEN}`,
    },
    body: JSON.stringify({
      to: to.startsWith("09") ? `959${to.slice(2)}` : to,
      message,
      sender: process.env.SMS_SENDER_ID || CLINIC_NAME.slice(0, 11),
    }),
  });
  if (!res.ok) throw new Error(`SMS_FAILED_${res.status}`);
}

export async function sendOtp(phone: string): Promise<{ demoCode?: string }> {
  const admin = getAdmin();
  const { data: existing } = await admin.from("otp_codes").select("last_sent_at").eq("phone", phone).maybeSingle();
  if (existing && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_AFTER_MS) {
    throw new Error("OTP_TOO_SOON");
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await admin.from("otp_codes").upsert({
    phone,
    code_hash: hashSecret(`${phone}:${code}`),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  });
  if (error) throw error;

  if (isSmsConfigured()) {
    await sendSms(phone, `${CLINIC_NAME}: သင့်အတည်ပြုကုဒ်မှာ ${code} ဖြစ်ပါသည်။ Your code is ${code}. (5 min)`);
    return {};
  }
  return isOtpDemoMode() ? { demoCode: code } : {};
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const admin = getAdmin();
  const { data } = await admin.from("otp_codes").select("*").eq("phone", phone).maybeSingle();
  if (!data) throw new Error("CODE_EXPIRED");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from("otp_codes").delete().eq("phone", phone);
    throw new Error("CODE_EXPIRED");
  }
  if (data.attempts >= MAX_ATTEMPTS) throw new Error("TOO_MANY_ATTEMPTS");

  if (!safeEqual(hashSecret(`${phone}:${code}`), data.code_hash)) {
    await admin.from("otp_codes").update({ attempts: data.attempts + 1 }).eq("phone", phone);
    throw new Error("INVALID_CODE");
  }
  await admin.from("otp_codes").delete().eq("phone", phone);
}
