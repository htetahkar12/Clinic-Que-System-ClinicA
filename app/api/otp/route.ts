import { NextRequest, NextResponse } from "next/server";
import { getAdmin, rpcErrorCode } from "@/lib/server/supabase-admin";
import { sendOtp, verifyOtp } from "@/lib/server/otp";
import { PATIENT_COOKIE, cookieOptions, createPatientToken } from "@/lib/server/staff-auth";
import { isValidMyanmarPhone, normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PATIENT_FIELDS = "id, phone, name, credit_points, fcm_token, preferred_language, created_at";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Passwordless SMS OTP login for patients. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  const phone = normalizePhone(body.phone || "");
  if (!isValidMyanmarPhone(phone)) return fail("INVALID_PHONE");

  try {
    const admin = getAdmin();

    if (body.action === "send") {
      const { data: existing } = await admin.from("patients").select("id").eq("phone", phone).maybeSingle();
      const { demoCode } = await sendOtp(phone);
      return NextResponse.json({ ok: true, isNew: !existing, demoCode });
    }

    if (body.action === "verify") {
      const code = String(body.code || "").replace(/\D/g, "");
      if (code.length !== 6) return fail("INVALID_CODE");
      const lang = body.lang === "en" ? "en" : "my";
      const name = String(body.name || "").trim().slice(0, 80);

      const { data: existing } = await admin.from("patients").select(PATIENT_FIELDS).eq("phone", phone).maybeSingle();
      if (!existing && !name) return fail("NAME_REQUIRED");

      await verifyOtp(phone, code);

      let patient = existing;
      if (existing) {
        const { data } = await admin
          .from("patients")
          .update({ preferred_language: lang, ...(name ? { name } : {}), updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select(PATIENT_FIELDS)
          .single();
        patient = data || existing;
      } else {
        const { data, error } = await admin
          .from("patients")
          .insert({ phone, name, preferred_language: lang })
          .select(PATIENT_FIELDS)
          .single();
        if (error) throw error;
        patient = data;
      }

      const { token, maxAge } = createPatientToken(patient!.id);
      const res = NextResponse.json({ ok: true, patient });
      res.cookies.set(PATIENT_COOKIE, token, cookieOptions(maxAge));
      return res;
    }

    return fail("UNKNOWN_ACTION");
  } catch (e) {
    const code = rpcErrorCode(e);
    return fail(code, code === "TOO_MANY_ATTEMPTS" || code === "OTP_TOO_SOON" ? 429 : 400);
  }
}
