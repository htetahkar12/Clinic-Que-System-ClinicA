import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId);

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Asks for notification permission and (if Firebase is configured) returns an
 * FCM web-push token for background push. Returns null when unavailable.
 */
export async function enableNotifications(): Promise<{ permission: NotificationPermission | "unsupported"; token: string | null }> {
  if (typeof window === "undefined" || !("Notification" in window)) return { permission: "unsupported", token: null };
  const permission = await Notification.requestPermission();
  if (permission !== "granted" || !isFirebaseConfigured) return { permission, token: null };
  try {
    if (!(await isSupported())) return { permission, token: null };
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const params = new URLSearchParams(
      Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)) as [string, string][]
    );
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, {
      scope: "/firebase-cloud-messaging-push-scope",
    });
    const token = await getToken(getMessaging(app), {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return { permission, token: token || null };
  } catch {
    return { permission, token: null };
  }
}

/** Foreground alert (app open): system notification + vibration. */
export function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  try {
    navigator.vibrate?.([300, 120, 300, 120, 500]);
  } catch {
    /* ignore */
  }
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  navigator.serviceWorker?.getRegistration().then((reg) => {
    if (reg) reg.showNotification(title, { body, icon: "/icon-192x192.svg", badge: "/icon-192x192.svg", tag: title });
    else new Notification(title, { body, icon: "/icon-192x192.svg" });
  }).catch(() => {
    try {
      new Notification(title, { body });
    } catch {
      /* ignore */
    }
  });
}
