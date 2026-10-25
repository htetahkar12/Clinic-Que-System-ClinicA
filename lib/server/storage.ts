import "server-only";
import crypto from "crypto";
import { getAdmin } from "@/lib/server/supabase-admin";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Uploads an image (as a data URI or Buffer) and returns a public URL.
 * Uses Cloudinary when configured (signed upload, no SDK needed),
 * otherwise falls back to the Supabase Storage "receipts" bucket.
 */
export async function uploadImage(params: {
  data: Buffer;
  mimeType: string;
  folder: "receipts" | "tickets";
  fileName: string;
}): Promise<string> {
  const { data, mimeType, folder, fileName } = params;

  if (isCloudinaryConfigured()) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.floor(Date.now() / 1000);
    const cloudFolder = `clinic-queue/${folder}`;
    const publicId = fileName.replace(/\.[a-z0-9]+$/i, "");
    const toSign = `folder=${cloudFolder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const form = new FormData();
    form.append("file", `data:${mimeType};base64,${data.toString("base64")}`);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", cloudFolder);
    form.append("public_id", publicId);
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
    if (!res.ok || !json.secure_url) {
      throw new Error(`Cloudinary upload failed: ${json.error?.message || res.status}`);
    }
    return json.secure_url;
  }

  const admin = getAdmin();
  const path = `${folder}/${fileName}`;
  const { error } = await admin.storage.from("receipts").upload(path, data, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return admin.storage.from("receipts").getPublicUrl(path).data.publicUrl;
}
