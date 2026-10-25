import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
];

/**
 * Signed Cloudinary / Supabase Storage image upload endpoint for:
 * - Payment receipts (KPay / WavePay / AYA Pay screenshots)
 * - QR Code Queue Pass images (folder = "tickets")
 * - Super Admin Clinic Logo uploads (folder = "branding")
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON body with { dataUrl, folder, fileName } (e.g. QR Code PNG Data URL)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const dataUrl = String(body.dataUrl || "");
      const folder =
        body.folder === "tickets" || body.folder === "branding"
          ? body.folder
          : "receipts";
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { ok: false, error: "INVALID_DATA_URL" },
          { status: 400 }
        );
      }
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const fileName = String(body.fileName || `qr-${Date.now()}.png`);
      const url = await uploadImage({
        data: buffer,
        mimeType,
        folder,
        fileName,
      });
      return NextResponse.json({ ok: true, url });
    }

    // 2. Multipart FormData with `file`
    const form = await req.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") || "receipts");
    const folder =
      folderRaw === "tickets" || folderRaw === "branding"
        ? folderRaw
        : "receipts";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "NO_FILE" },
        { status: 400 }
      );
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    const ext = (file.type.split("/")[1] || "png").replace("+xml", "");
    const url = await uploadImage({
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/png",
      folder,
      fileName: `${folder}-${Date.now()}.${ext}`,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}
