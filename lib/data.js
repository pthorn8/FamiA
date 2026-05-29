// lib/data.js
// All databaslogik: familjer, listor, kalender, aktivitetslogg.
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

// === Hjälpare ===

function firstName(user) {
  return user.displayName?.split(" ")[0] || user.name?.split(" ")[0] || "Någon";
}

function makeInviteCode() {
  const a = ["GLAD", "SNABB", "LUGN", "VARM", "MJUK", "PIGG", "FIN", "KLAR", "SOL", "MILD"];
  const b = ["RAV", "BJORN", "UGGLA", "ALG", "KATT", "MAS", "TRAN", "ORN", "VARG", "HARE"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(a)}-${pick(b)}-${Math.floor(10 + Math.random() * 89)}`;
}

// Logga en händelse i familjens aktivitetsflöde
async function logActivity(familyId, user, emoji, text) {
  try {
    await addDoc(collection(db, "families", familyId, "activity"), {
      emoji,
      text,
      by: { uid: user.uid, name: firstName(user) },
      at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Kunde inte logga aktivitet:", e);
  }
}

// === FAMILJER ===

export async function createFamily(user, familyName) {
  const inviteCode = makeInviteCode();
  const ref = await addDoc(collection(db, "families"), {
    name: familyName,
    inviteCode,
    memberIds: [user.uid],
    members: [
      {
        uid: user.uid,
        name: firstName(user),
        photoURL: user.photoURL || "",
        role: "Admin",
      },
    ],
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", user.uid), { currentFamilyId: ref.id });
  await logActivity(ref.id, user, "✨", `skapade familjen`);
  return ref.id;
}

export async function joinFamily(user, inviteCode) {
  const code = inviteCode.trim().toUpperCase();
  const q = query(collection(db, "families"), where("inviteCode", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Ingen familj hittades med den koden");
  const famDoc = snap.docs[0];
  if (famDoc.data().memberIds?.includes(user.uid)) {
    await updateDoc(doc(db, "users", user.uid), { currentFamilyId: famDoc.id });
    return famDoc.id;
  }
  await updateDoc(doc(db, "families", famDoc.id), {
    memberIds: arrayUnion(user.uid),
    members: arrayUnion({
      uid: user.uid,
      name: firstName(user),
      photoURL: user.photoURL || "",
      role: "Medlem",
    }),
  });
  await updateDoc(doc(db, "users", user.uid), { currentFamilyId: famDoc.id });
  await logActivity(famDoc.id, user, "👋", `gick med i familjen`);
  return famDoc.id;
}

export async function leaveFamily(user, familyId) {
  const ref = doc(db, "families", familyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const newMembers = (data.members || []).filter((m) => m.uid !== user.uid);
  const newIds = (data.memberIds || []).filter((id) => id !== user.uid);
  await updateDoc(ref, { members: newMembers, memberIds: newIds });
  // Sätt currentFamilyId till någon annan familj användaren tillhör, eller null
  const other = await getDocs(
    query(collection(db, "families"), where("memberIds", "array-contains", user.uid))
  );
  const nextId = other.empty ? null : other.docs[0].id;
  await updateDoc(doc(db, "users", user.uid), { currentFamilyId: nextId });
}

export async function renameFamily(familyId, newName, user) {
  await updateDoc(doc(db, "families", familyId), { name: newName });
  await logActivity(familyId, user, "✏️", `döpte om familjen till "${newName}"`);
}

export async function switchFamily(user, familyId) {
  await updateDoc(doc(db, "users", user.uid), { currentFamilyId: familyId });
}

export function watchUserFamily(uid, callback) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? snap.data().currentFamilyId || null : null);
  });
}

export function watchUserFamilies(uid, callback) {
  const q = query(collection(db, "families"), where("memberIds", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function watchFamily(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// === LISTOR ===

export function watchLists(familyId, callback) {
  const q = collection(db, "families", familyId, "lists");
  return onSnapshot(q, (snap) => {
    const lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    lists.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    callback(lists);
  });
}

export async function createList(familyId, name, icon, user) {
  const ref = await addDoc(collection(db, "families", familyId, "lists"), {
    name,
    icon: icon || "📋",
    items: [],
    createdAt: serverTimestamp(),
  });
  await logActivity(familyId, user, icon || "📋", `skapade listan "${name}"`);
  return ref.id;
}

export async function updateList(familyId, listId, updates, user, logText) {
  await updateDoc(doc(db, "families", familyId, "lists", listId), updates);
  if (logText) await logActivity(familyId, user, "✏️", logText);
}

export async function updateListItems(familyId, listId, items) {
  return updateDoc(doc(db, "families", familyId, "lists", listId), { items });
}

export async function addListItem(familyId, list, item, user) {
  const items = [
    ...list.items,
    {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      text: item.text,
      done: false,
      addedBy: firstName(user),
      assignedTo: item.assignedTo || null,
      dueDate: item.dueDate || null,
    },
  ];
  await updateListItems(familyId, list.id, items);
  await logActivity(familyId, user, "➕", `lade till "${item.text}" i ${list.name}`);
}

export async function toggleListItem(familyId, list, itemId, user) {
  const target = list.items.find((i) => i.id === itemId);
  if (!target) return;
  const newDone = !target.done;
  const items = list.items.map((i) =>
    i.id === itemId
      ? { ...i, done: newDone, doneBy: newDone ? firstName(user) : null }
      : i
  );
  await updateListItems(familyId, list.id, items);
  if (newDone) {
    await logActivity(familyId, user, "✅", `bockade av "${target.text}"`);
  }
}

export async function deleteListItem(familyId, list, itemId, user) {
  const target = list.items.find((i) => i.id === itemId);
  const items = list.items.filter((i) => i.id !== itemId);
  await updateListItems(familyId, list.id, items);
  if (target) await logActivity(familyId, user, "🗑️", `tog bort "${target.text}"`);
}

export async function assignListItem(familyId, list, itemId, assignedTo, user) {
  const items = list.items.map((i) =>
    i.id === itemId ? { ...i, assignedTo } : i
  );
  await updateListItems(familyId, list.id, items);
  const target = list.items.find((i) => i.id === itemId);
  if (assignedTo && target) {
    await logActivity(familyId, user, "👉", `tilldelade "${target.text}" till ${assignedTo}`);
  }
}

export async function setItemDueDate(familyId, list, itemId, dueDate) {
  const items = list.items.map((i) => (i.id === itemId ? { ...i, dueDate } : i));
  await updateListItems(familyId, list.id, items);
}

export async function clearCompleted(familyId, list, user) {
  const items = list.items.filter((i) => !i.done);
  await updateListItems(familyId, list.id, items);
  await logActivity(familyId, user, "🧹", `rensade klara från ${list.name}`);
}

export async function deleteList(familyId, listId, listName, user) {
  await deleteDoc(doc(db, "families", familyId, "lists", listId));
  await logActivity(familyId, user, "🗑️", `tog bort listan "${listName}"`);
}

// === KALENDER ===

export function watchEvents(familyId, callback) {
  const q = collection(db, "families", familyId, "events");
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createEvent(familyId, event, user) {
  await addDoc(collection(db, "families", familyId, "events"), {
    ...event,
    createdAt: serverTimestamp(),
  });
  const recurText = event.recurrence ? ` (${recurrenceLabel(event.recurrence)})` : "";
  await logActivity(familyId, user, "📅", `lade till "${event.title}"${recurText}`);
}

export async function deleteEvent(familyId, eventId, eventTitle, user) {
  await deleteDoc(doc(db, "families", familyId, "events", eventId));
  if (eventTitle) await logActivity(familyId, user, "🗑️", `tog bort händelsen "${eventTitle}"`);
}

function recurrenceLabel(r) {
  return { daily: "varje dag", weekly: "varje vecka", monthly: "varje månad", yearly: "varje år" }[r] || "";
}

// Expandera återkommande händelser för ett datumintervall.
// Returnerar en platt lista av "instanser" med beräknat datum.
export function expandEvents(events, fromDate, toDate) {
  const out = [];
  const from = new Date(fromDate);
  const to = new Date(toDate);

  for (const e of events) {
    if (!e.date) continue;
    const start = new Date(e.date);
    if (!e.recurrence) {
      if (start >= from && start <= to) out.push({ ...e, _date: e.date });
      continue;
    }
    // Iterera framåt från startdatum tills vi når slutet av intervallet
    let cursor = new Date(start);
    let safety = 0;
    while (cursor <= to && safety++ < 500) {
      if (cursor >= from) {
        const iso = cursor.toISOString().slice(0, 10);
        out.push({ ...e, _date: iso, _instance: true });
      }
      if (e.recurrence === "daily") cursor.setDate(cursor.getDate() + 1);
      else if (e.recurrence === "weekly") cursor.setDate(cursor.getDate() + 7);
      else if (e.recurrence === "monthly") cursor.setMonth(cursor.getMonth() + 1);
      else if (e.recurrence === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
      else break;
    }
  }
  return out;
}

// === AKTIVITET ===

export function watchActivity(familyId, callback, max = 30) {
  const q = query(
    collection(db, "families", familyId, "activity"),
    orderBy("at", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// === CHATT ===

export function watchMessages(familyId, callback, max = 100) {
  const q = query(
    collection(db, "families", familyId, "messages"),
    orderBy("at", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    // Sortera i stigande ordning (äldst först) för visning
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    msgs.reverse();
    callback(msgs);
  });
}

export async function sendMessage(familyId, user, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "families", familyId, "messages"), {
    text: trimmed,
    senderId: user.uid,
    senderName: firstName(user),
    senderPhoto: user.photoURL || "",
    at: serverTimestamp(),
  });
}
