import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/server/storage";
import { getPatientId, isStaffRequest } from "@/lib/server/staff-auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Payment receipt upload (KPay / WavePay / AYA Pay screenshot). Signed-in patients or staff only. */
export async function POST(req: NextRequest) {
  const patientId = getPatientId();
  if (!patientId && !isStaffRequest()) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ ok: false, error: "INVALID_FILE_TYPE" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });

    const ext = file.type.split("/")[1] || "jpg";
    const url = await uploadImage({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      folder: "receipts",
      fileName: `${patientId || "staff"}-${Date.now()}.${ext}`,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "UPLOAD_FAILED" }, { status: 500 });
  }
}
