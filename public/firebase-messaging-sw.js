// public/firebase-messaging-sw.js
// Tar emot push-notiser när appen är stängd eller i bakgrunden.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBofY4lsUo_fRoHSwxaeL5eudpKI26gNLg",
  authDomain: "familjeapp-bb9de.firebaseapp.com",
  projectId: "familjeapp-bb9de",
  storageBucket: "familjeapp-bb9de.firebasestorage.app",
  messagingSenderId: "474694583381",
  appId: "1:474694583381:web:bc1e3b97ca20fed890c0dc",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Familjeappen";
  const body = payload.notification?.body || payload.data?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.data?.url || "/" },
    tag: payload.data?.tag || "familjeappen",
  });
});

// Öppna appen när man trycker på notisen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
