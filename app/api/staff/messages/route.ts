import { NextRequest, NextResponse } from "next/server";
import { rpcErrorCode } from "@/lib/server/supabase-admin";
import { isStaffRequest } from "@/lib/server/staff-auth";
import { dispatchMessages } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

/**
 * Broadcast engine: manual bilingual messages from reception.
 * target = "doctor" (all of today's patients of one doctor) | "booking" (one patient) | "all"
 */
export async function POST(req: NextRequest) {
  if (!isStaffRequest()) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;

  const clean = (v: string | undefined, max: number) => String(v || "").trim().slice(0, max);
  let title_en = clean(body.title_en, 120);
  let body_en = clean(body.body_en, 1000);
  let title_my = clean(body.title_my, 120);
  let body_my = clean(body.body_my, 1000);

  // Allow writing in only one language: copy it to the other.
  if (!title_my && title_en) title_my = title_en;
  if (!title_en && title_my) title_en = title_my;
  if (!body_my && body_en) body_my = body_en;
  if (!body_en && body_my) body_en = body_my;
  if (!title_en || !body_en) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

  const target = body.target === "booking" ? "booking" : body.target === "all" ? "all" : "doctor";
  if (target === "doctor" && !body.doctorId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  if (target === "booking" && !body.bookingId) return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });

  try {
    const res = await dispatchMessages([
      {
        doctor_id: target === "doctor" ? body.doctorId! : null,
        booking_id: target === "booking" ? body.bookingId! : null,
        patient_id: target === "booking" && body.patientId ? body.patientId : null,
        kind: "manual",
        category: "info",
        title_en,
        body_en,
        title_my,
        body_my,
      },
    ]);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: rpcErrorCode(e) }, { status: 500 });
  }
}
