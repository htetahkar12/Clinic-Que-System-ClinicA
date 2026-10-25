// Clinic Queue & Broadcast Push Notification Service Worker
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_CLINIC_NOTIFICATION") return;

  const title = data.title || "ဆေးခန်းမှ အရေးကြီး အသိပေးချက်";
  const body = data.body || "";
  const tag = data.tag || "clinic-live-alert-" + Date.now();

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192x192.svg",
      badge: "/icon-192x192.svg",
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [400, 120, 400, 120, 600],
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});
