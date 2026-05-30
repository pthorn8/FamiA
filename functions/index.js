// functions/index.js
// Schemalagd funktion som varje morgon skickar påminnelser:
//  • dagens förfallande uppgifter (listor)
//  • dagens händelser
//  • händelser som är imorgon (1 dag kvar)
//  • händelser som är om en vecka (7 dagar kvar)
// Varje notis respekterar mottagarens egna notis-inställningar.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

exports.dailyReminders = onSchedule(
  { schedule: "every day 07:00", timeZone: "Europe/Stockholm" },
  async () => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);
    const todayStr = toISO(today);

    const families = await db.collection("families").get();

    for (const fam of families.docs) {
      const famData = fam.data();

      // --- Listor: dagens förfallande uppgifter ---
      const listsSnap = await fam.ref.collection("lists").get();
      const dueItems = [];
      listsSnap.forEach((l) => {
        (l.data().items || []).forEach((it) => {
          if (!it.done && it.dueDate === todayStr) dueItems.push(it.text);
        });
      });

      // --- Händelser: idag, imorgon, om en vecka ---
      const eventsSnap = await fam.ref.collection("events").get();
      const todayEvents = [];
      const tomorrowEvents = [];
      const weekEvents = [];
      eventsSnap.forEach((e) => {
        const ev = e.data();
        const label = ev.time ? `${ev.time} ${ev.title}` : ev.title;
        if (occursOn(ev, today)) todayEvents.push(label);
        if (occursOn(ev, tomorrow)) tomorrowEvents.push(label);
        if (occursOn(ev, nextWeek)) weekEvents.push(label);
      });

      // Mottagar-tokens uppdelat per kategori (respekterar inställningar)
      const memberIds = (famData.memberIds || []).slice();
      const tokensByCategory = await collectTokens(memberIds);

      // 1. Dagens uppgifter (kategori: listor)
      if (dueItems.length > 0) {
        await send(tokensByCategory.lists, `📋 Att göra idag`, summarize(dueItems));
      }

      // 2. Dagens händelser (kategori: kalender)
      if (todayEvents.length > 0) {
        await send(tokensByCategory.calendar, `📅 Idag i ${famData.name}`, summarize(todayEvents));
      }

      // 3. Imorgon – 1 dag kvar (kategori: kalender)
      if (tomorrowEvents.length > 0) {
        await send(tokensByCategory.calendar, `📅 Imorgon`, summarize(tomorrowEvents));
      }

      // 4. Om en vecka – 7 dagar kvar (kategori: kalender)
      if (weekEvents.length > 0) {
        await send(tokensByCategory.calendar, `📅 Om en vecka`, summarize(weekEvents));
      }
    }
  }
);

// Hämta tokens per kategori, hoppar över de som stängt av kategorin
async function collectTokens(memberIds) {
  const result = { lists: [], calendar: [] };
  for (const uid of memberIds) {
    const snap = await db.doc(`users/${uid}`).get();
    const data = snap.data() || {};
    const tokens = data.fcmTokens || [];
    const prefs = data.notifPrefs || {};
    if (prefs.lists !== false) result.lists.push(...tokens);
    if (prefs.calendar !== false) result.calendar.push(...tokens);
  }
  return result;
}

async function send(tokens, title, body) {
  if (!tokens || tokens.length === 0) return;
  await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
      fcmOptions: { link: "/" },
    },
  });
}

// Max fyra rader plus "+ N till"
function summarize(list) {
  const lines = list.slice(0, 4).map((t) => `• ${t}`);
  if (list.length > 4) lines.push(`+ ${list.length - 4} till`);
  return lines.join("\n");
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
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
