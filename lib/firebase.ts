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

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId
);

let sharedAudioCtx: AudioContext | null = null;
let keepAliveInterval: number | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Keeps the mobile browser audio & network loop alive even when the phone
 * screen is turned off (Screen Off) so live queue & Reception alerts still
 * ring "တီ — တီ!" immediately.
 */
export function ensureBackgroundAlertKeepAlive() {
  if (typeof window === "undefined") return;
  const ctx = getOrCreateAudioContext();

  // Request Screen WakeLock when supported
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<unknown> };
    };
    nav.wakeLock?.request("screen").catch(() => {});
  } catch {
    /* ignore */
  }

  // Register Service Worker for OS lock-screen notifications
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/clinic-push-sw.js").catch(() => {});
  }

  // Periodic sub-audible pulse every 15s so mobile OS does not suspend JS timers when screen is off
  if (ctx && !keepAliveInterval) {
    keepAliveInterval = window.setInterval(() => {
      try {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch {
        /* ignore */
      }
    }, 15000);
  }
}

/**
 * Plays a loud, clear "တီ — တီ — တီ!" (Beep-Beep-Beep) medical pager alarm
 * and vibrates the phone so the patient hears it even with the screen off.
 */
export function playMedicalBeepAlert() {
  if (typeof window === "undefined") return;
  try {
    navigator.vibrate?.([400, 120, 400, 120, 600]);
  } catch {
    /* ignore */
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.45, now + startOffset + 0.02);
      gain.gain.setValueAtTime(0.45, now + startOffset + duration - 0.03);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + startOffset + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    // Crisp 3-pulse "တီ - တီ - တီ!" medical alert
    playTone(1046.5, 0.0, 0.18);
    playTone(1318.5, 0.24, 0.18);
    playTone(1567.98, 0.48, 0.32);
  } catch {
    /* ignore */
  }
}

export function notificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  return Notification.permission;
}

/**
 * Asks for notification permission, registers `/clinic-push-sw.js`, unlocks
 * background audio keep-alive, and plays a confirmation "တီ!" beep.
 */
export async function enableNotifications(): Promise<{
  permission: NotificationPermission | "unsupported";
  token: string | null;
}> {
  if (typeof window === "undefined") {
    return { permission: "unsupported", token: null };
  }

  ensureBackgroundAlertKeepAlive();
  playMedicalBeepAlert();

  if (!("Notification" in window)) {
    return { permission: "unsupported", token: null };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker
      .register("/clinic-push-sw.js")
      .catch(() => null);
  }

  if (permission !== "granted" || !isFirebaseConfigured) {
    return { permission, token: null };
  }

  try {
    if (!(await isSupported())) return { permission, token: null };
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const params = new URLSearchParams(
      Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)) as [
        string,
        string
      ][]
    );
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params}`,
      {
        scope: "/firebase-cloud-messaging-push-scope",
      }
    );
    const token = await getToken(getMessaging(app), {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return { permission, token: token || null };
  } catch {
    return { permission, token: null };
  }
}

/**
 * Fires both the loud "တီ — တီ — တီ!" audio + vibration AND the native OS
 * Service Worker Push Notification banner (works even when screen is off).
 */
export function showLocalNotification(
  title: string,
  body: string,
  tag?: string
) {
  if (typeof window === "undefined") return;

  // Always play the "တီ — တီ — တီ!" sound & vibrate immediately
  playMedicalBeepAlert();

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notifTag = tag || `clinic-alert-${Date.now()}`;
  const options: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
  } = {
    body,
    icon: "/icon-192x192.svg",
    badge: "/icon-192x192.svg",
    tag: notifTag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [400, 120, 400, 120, 600],
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) {
          reg.active?.postMessage({
            type: "SHOW_CLINIC_NOTIFICATION",
            title,
            body,
            tag: notifTag,
          });
          return reg.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      })
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {
          /* ignore */
        }
      });
  } else {
    try {
      new Notification(title, options);
    } catch {
      /* ignore */
    }
  }
}
