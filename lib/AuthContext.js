// lib/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const AuthContext = createContext(null);

async function upsertUserDoc(u) {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: u.displayName || "Ny medlem",
      email: u.email || "",
      photoURL: u.photoURL || "",
      createdAt: serverTimestamp(),
    });
  }
}

function isSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua) || (ua.includes("Safari") && !ua.includes("Chrome"));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hantera redirect-resultat efter Google-inloggning på Safari/mobil
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) await upsertUserDoc(result.user);
      })
      .catch(() => {});

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) await upsertUserDoc(u);
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = () => {
    // Safari/iPhone kräver redirect istället för popup
    if (isSafari()) {
      return signInWithRedirect(auth, googleProvider);
    }
    return signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
  const signUpWithEmail = async (email, pw, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    if (name) await updateProfile(cred.user, { displayName: name });
    await upsertUserDoc({ ...cred.user, displayName: name });
    return cred;
  };
  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
