import "server-only";
import { getAdmin } from "@/lib/server/supabase-admin";
import { clinicToday } from "@/lib/date";
import type { Lang, MessageInsert } from "@/lib/types";
import { CLINIC_NAME, CLINIC_NAME_MY } from "@/clinic.config";

function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      !process.env.FIREBASE_PROJECT_ID.includes("your-")
  );
}

async function sendPush(tokens: Array<{ token: string; lang: Lang }>, msg: MessageInsert) {
  if (!isFirebaseAdminConfigured() || tokens.length === 0) return 0;
  const admin = await import("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  let sent = 0;
  await Promise.all(
    tokens.map(async ({ token, lang }) => {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title: `${lang === "my" ? CLINIC_NAME_MY : CLINIC_NAME} — ${lang === "my" ? msg.title_my : msg.title_en}`,
            body: lang === "my" ? msg.body_my : msg.body_en,
          },
          webpush: { fcmOptions: { link: "/" } },
        });
        sent++;
      } catch {
        // Invalid/expired token — ignore (patient will still see the in-app message)
      }
    })
  );
  return sent;
}

/** Resolves which patients a message targets (for push notifications). */
async function resolveRecipients(msg: MessageInsert): Promise<Array<{ token: string; lang: Lang }>> {
  const admin = getAdmin();
  let patientIds: string[] = [];

  if (msg.patient_id) {
    patientIds = [msg.patient_id];
  } else if (msg.booking_id) {
    const { data } = await admin.from("bookings").select("patient_id").eq("id", msg.booking_id).single();
    if (data) patientIds = [data.patient_id];
  } else if (msg.doctor_id) {
    const { data } = await admin
      .from("bookings")
      .select("patient_id")
      .eq("doctor_id", msg.doctor_id)
      .eq("booking_date", msg.message_date || clinicToday())
      .in("status", ["waiting", "in_progress"]);
    patientIds = Array.from(new Set((data || []).map((b) => b.patient_id)));
  } else {
    return []; // broadcast — in-app only (avoid mass push to every patient ever)
  }

  if (patientIds.length === 0) return [];
  const { data: pats } = await admin
    .from("patients")
    .select("fcm_token, preferred_language")
    .in("id", patientIds);
  return (pats || [])
    .filter((p) => p.fcm_token && !String(p.fcm_token).startsWith("local_"))
    .map((p) => ({ token: p.fcm_token as string, lang: (p.preferred_language as Lang) || "my" }));
}

/** Stores messages (shown live in the Patient Portal via Realtime) and sends FCM push. */
export async function dispatchMessages(messages: MessageInsert[]): Promise<{ stored: number; pushed: number }> {
  if (messages.length === 0) return { stored: 0, pushed: 0 };
  const admin = getAdmin();
  const rows = messages.map((m) => ({ ...m, message_date: m.message_date || clinicToday() }));
  const { error } = await admin.from("messages").insert(rows);
  if (error) throw new Error(error.message);

  let pushed = 0;
  for (const m of rows) {
    try {
      const recipients = await resolveRecipients(m);
      pushed += await sendPush(recipients, m);
    } catch {
      // push failures must never break the main action
    }
  }
  return { stored: rows.length, pushed };
}
