import "server-only";
import QRCode from "qrcode";
import { getAdmin } from "@/lib/server/supabase-admin";
import { uploadImage } from "@/lib/server/storage";

export function appBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Generates a QR code PNG for the ticket link, uploads it (Cloudinary or
 * Supabase Storage) and saves the public URL on the booking, so the ticket
 * image can be shared via Viber / Messenger / SMS. Never throws.
 */
export async function attachTicketQr(bookingId: string, ticketCode: string, baseUrl: string) {
  try {
    const url = `${baseUrl}/ticket/${bookingId}`;
    const png = await QRCode.toBuffer(url, { width: 600, margin: 2, errorCorrectionLevel: "M" });
    const imageUrl = await uploadImage({
      data: png,
      mimeType: "image/png",
      folder: "tickets",
      fileName: `ticket-${ticketCode}-${bookingId.slice(0, 8)}.png`,
    });
    await getAdmin().from("bookings").update({ qr_image_url: imageUrl }).eq("id", bookingId);
    return imageUrl;
  } catch {
    return null;
  }
}
