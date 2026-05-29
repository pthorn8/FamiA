// components/Login.js
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/lib/ToastContext";

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState("welcome"); // welcome | signin | signup
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.show("Inloggningen avbröts", "error");
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!form.email || !form.password) {
      toast.show("Fyll i alla fält", "error");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        if (form.password.length < 6) {
          throw new Error("Lösenordet måste vara minst 6 tecken");
        }
        await signUpWithEmail(form.email, form.password, form.name);
      } else {
        await signInWithEmail(form.email, form.password);
      }
    } catch (e) {
      const msg = e.code === "auth/invalid-credential"
        ? "Fel e-post eller lösenord"
        : e.code === "auth/email-already-in-use"
        ? "E-posten är redan registrerad"
        : e.message || "Något gick fel";
      toast.show(msg, "error");
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #2D3142 0%, #3D405B 60%, #4a3d5e 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: "32px 24px",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "slideIn 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              fontSize: 64,
              marginBottom: 16,
              animation: "scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            🏡
          </div>
          <h1 className="serif" style={{ fontSize: 36, marginBottom: 12, letterSpacing: -0.5 }}>
            Familjeappen
          </h1>
          <p style={{ opacity: 0.7, fontSize: 15, lineHeight: 1.5, maxWidth: 300, margin: "0 auto" }}>
            Delade listor och kalender för hela familjen. På samma ställe.
          </p>
        </div>

        {mode === "welcome" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "slideIn 0.3s ease" }}>
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{
                background: "white",
                color: "#2D3142",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <GoogleIcon />
              Fortsätt med Google
            </button>
            <button
              onClick={() => setMode("signin")}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📧 Fortsätt med e-post
            </button>
          </div>
        )}

        {mode !== "welcome" && (
          <div style={{ animation: "slideIn 0.25s ease", display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "signup" && (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ditt namn"
                style={inputStyle}
              />
            )}
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="E-post"
              type="email"
              autoComplete="email"
              style={inputStyle}
            />
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Lösenord"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              style={inputStyle}
            />
            <button
              onClick={handleEmail}
              disabled={busy}
              style={{
                background: "var(--coral)",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 6,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Vänta..." : (mode === "signup" ? "Skapa konto" : "Logga in")}
            </button>
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                cursor: "pointer",
                padding: 12,
              }}
            >
              {mode === "signin" ? "Inget konto? Skapa ett" : "Har du redan konto? Logga in"}
            </button>
            <button
              onClick={() => setMode("welcome")}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
                cursor: "pointer",
                padding: 4,
              }}
            >
              ← Andra sätt att logga in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.96 8.96 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
