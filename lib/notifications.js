// lib/notifications.js
// Hanterar push-notiser: be om tillåtelse, hämta token, lyssna på meddelanden.
"use client";

import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { app, db } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let messagingInstance = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (e) {
    return null;
  }
}

// Kollar om push-notiser stöds av den här enheten/webbläsaren
export async function notificationsSupported() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  const supported = await isSupported();
  return supported;
}

// Nuvarande tillstånd: "granted" | "denied" | "default" | "unsupported"
export async function notificationStatus() {
  if (!(await notificationsSupported())) return "unsupported";
  return Notification.permission;
}

// Be om tillåtelse och spara token i användarens profil
export async function enableNotifications(user) {
  const messaging = await getMessagingInstance();
  if (!messaging) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return { ok: false, reason: "no-token" };
    await updateDoc(doc(db, "users", user.uid), {
      fcmTokens: arrayUnion(token),
    });
    return { ok: true, token };
  } catch (e) {
    console.warn("Kunde inte hämta notis-token:", e);
    return { ok: false, reason: "error" };
  }
}

// Stäng av notiser på den här enheten (ta bort token)
export async function disableNotifications(user) {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await updateDoc(doc(db, "users", user.uid), {
        fcmTokens: arrayRemove(token),
      });
    }
  } catch (e) {}
}

// Lyssna på meddelanden när appen är öppen (visar en toast i stället för systemnotis)
export async function listenForeground(onNotification) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title;
    const body = payload.notification?.body || payload.data?.body;
    if (title) onNotification({ title, body });
  });
}
