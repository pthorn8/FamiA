// functions/index.js
// Schemalagd funktion som varje morgon skickar en notis med dagens
// förfallande uppgifter och händelser till varje familjemedlem.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// Körs varje dag kl 07:00 svensk tid
exports.dailyReminders = onSchedule(
  { schedule: "every day 07:00", timeZone: "Europe/Stockholm" },
  async () => {
    const today = new Date();
    const todayStr = toISO(today);

    const families = await db.collection("families").get();

    for (const fam of families.docs) {
      const famData = fam.data();

      // Dagens förfallande uppgifter
      const listsSnap = await fam.ref.collection("lists").get();
      const dueItems = [];
      listsSnap.forEach((l) => {
        (l.data().items || []).forEach((it) => {
          if (!it.done && it.dueDate === todayStr) dueItems.push(it.text);
        });
      });

      // Dagens händelser (inklusive återkommande)
      const eventsSnap = await fam.ref.collection("events").get();
      const todayEvents = [];
      eventsSnap.forEach((e) => {
        const ev = e.data();
        if (occursOn(ev, today)) {
          todayEvents.push(ev.time ? `${ev.time} ${ev.title}` : ev.title);
        }
      });

      if (dueItems.length === 0 && todayEvents.length === 0) continue;

      // Bygg meddelandetext
      const lines = [
        ...dueItems.slice(0, 4).map((t) => `📋 ${t}`),
        ...todayEvents.slice(0, 4).map((t) => `📅 ${t}`),
      ];
      const extra = dueItems.length + todayEvents.length - lines.length;
      if (extra > 0) lines.push(`+ ${extra} till`);
      const body = lines.join("\n");

      // Samla tokens
      const tokens = [];
      for (const uid of famData.memberIds || []) {
        const u = await db.doc(`users/${uid}`).get();
        (u.data()?.fcmTokens || []).forEach((t) => tokens.push(t));
      }
      if (tokens.length === 0) continue;

      await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: `☀️ Idag i ${famData.name}`, body },
        webpush: {
          notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
          fcmOptions: { link: "/" },
        },
      });
    }
  }
);

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

// Inträffar händelsen på det givna datumet (med hänsyn till återkommande)?
function occursOn(ev, date) {
  if (!ev.date) return false;
  const start = new Date(ev.date + "T00:00:00");
  const target = new Date(toISO(date) + "T00:00:00");
  if (target < start) return false;
  if (!ev.recurrence) return toISO(start) === toISO(target);

  if (ev.recurrence === "daily") return true;
  if (ev.recurrence === "weekly") return start.getDay() === target.getDay();
  if (ev.recurrence === "monthly") return start.getDate() === target.getDate();
  if (ev.recurrence === "yearly")
    return start.getDate() === target.getDate() && start.getMonth() === target.getMonth();
  return false;
}
