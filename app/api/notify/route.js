// app/api/notify/route.js
// Serverfunktion som skickar push-notiser till familjens medlemmar.
// Körs på Vercel. Använder Firebase Admin med ett service account.
import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT saknas");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

export async function POST(req) {
  try {
    const adminApp = getAdmin();
    const db = adminApp.firestore();

    // Verifiera att anroparen är inloggad
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Ingen token" }, { status: 401 });
    }
    const decoded = await adminApp.auth().verifyIdToken(idToken);
    const senderId = decoded.uid;

    const { familyId, title, body, url, category } = await req.json();
    if (!familyId || !title) {
      return NextResponse.json({ error: "Saknar fält" }, { status: 400 });
    }

    // Hämta familjen och kontrollera att avsändaren är medlem
    const famSnap = await db.doc(`families/${familyId}`).get();
    if (!famSnap.exists) {
      return NextResponse.json({ error: "Familjen finns inte" }, { status: 404 });
    }
    const memberIds = famSnap.data().memberIds || [];
    if (!memberIds.includes(senderId)) {
      return NextResponse.json({ error: "Inte medlem" }, { status: 403 });
    }

    // Samla in tokens från alla andra medlemmar som vill ha den här sortens notis
    const recipients = memberIds.filter((id) => id !== senderId);
    const tokenMap = {}; // token -> uid (för att kunna städa bort ogiltiga)
    for (const uid of recipients) {
      const userSnap = await db.doc(`users/${uid}`).get();
      const data = userSnap.data() || {};
      // Kolla inställningar: standard är på om inget angetts
      const prefs = data.notifPrefs || {};
      if (category && category !== "other" && prefs[category] === false) continue;
      const tokens = data.fcmTokens || [];
      for (const t of tokens) tokenMap[t] = uid;
    }
    const tokens = Object.keys(tokenMap);
    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Skicka
    const message = {
      tokens,
      notification: { title, body: body || "" },
      data: { url: url || "/", title, body: body || "" },
      webpush: {
        notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
        fcmOptions: { link: url || "/" },
      },
    };
    const res = await adminApp.messaging().sendEachForMulticast(message);

    // Städa bort tokens som inte längre fungerar
    const toRemove = {};
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
          const token = tokens[i];
          const uid = tokenMap[token];
          if (!toRemove[uid]) toRemove[uid] = [];
          toRemove[uid].push(token);
        }
      }
    });
    for (const [uid, badTokens] of Object.entries(toRemove)) {
      await db.doc(`users/${uid}`).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
      });
    }

    return NextResponse.json({ sent: res.successCount });
  } catch (e) {
    console.error("notify-fel:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
