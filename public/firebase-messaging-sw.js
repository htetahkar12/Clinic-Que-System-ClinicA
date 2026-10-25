/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker (background push).
// Config is passed as query params when the app registers this worker.
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const params = new URL(self.location).searchParams;
const config = {};
for (const [k, v] of params.entries()) config[k] = v;

if (config.apiKey && config.projectId && config.messagingSenderId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  // Notification payloads are shown automatically by FCM.
  // Data-only payloads are shown here.
  messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;
    const title = (payload.data && payload.data.title) || "Clinic";
    self.registration.showNotification(title, {
      body: (payload.data && payload.data.body) || "",
      icon: "/icon-192x192.svg",
      badge: "/icon-192x192.svg",
      vibrate: [300, 120, 300, 120, 500],
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return clients.openWindow("/");
    })
  );
});
