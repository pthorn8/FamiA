// components/Onboarding.js
"use client";

import { useState } from "react";
import { createFamily, joinFamily } from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/lib/AuthContext";

export default function Onboarding({ user }) {
  const [mode, setMode] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { signOut } = useAuth();

  const handleCreate = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await createFamily(user, value.trim());
      toast.show("Familj skapad");
    } catch (e) {
      toast.show("Något gick fel", "error");
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await joinFamily(user, value);
      toast.show("Välkommen!");
    } catch (e) {
      toast.show(e.message || "Kunde inte gå med", "error");
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "32px 24px",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h1 className="serif" style={{ fontSize: 30, marginBottom: 8, letterSpacing: -0.5 }}>
            Välkommen!
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.5 }}>
            Skapa en ny familj eller gå med i en befintlig grupp.
          </p>
        </div>

        {!mode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Choice icon="✨" title="Skapa ny familj" desc="Starta en grupp och bjud in andra" onClick={() => setMode("create")} />
            <Choice icon="🔗" title="Gå med i familj" desc="Har du fått en inbjudningskod?" onClick={() => setMode("join")} />
          </div>
        )}

        {mode && (
          <div style={{ animation: "slideIn 0.2s ease" }}>
            <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
              {mode === "create" ? "Vad heter familjen?" : "Inbjudningskod"}
            </label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleJoin())}
              placeholder={mode === "create" ? "t.ex. Familjen Lindgren" : "t.ex. GLAD-RAV-72"}
              autoFocus
              style={{
                width: "100%",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 16,
                outline: "none",
                marginBottom: 12,
                background: "var(--surface)",
              }}
            />
            <button
              onClick={mode === "create" ? handleCreate : handleJoin}
              disabled={busy}
              style={{
                width: "100%",
                background: "var(--coral)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                fontSize: 16,
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
                marginBottom: 10,
              }}
            >
              {busy ? "Vänta..." : mode === "create" ? "Skapa familj" : "Gå med"}
            </button>
            <button
              onClick={() => { setMode(null); setValue(""); }}
              style={{ width: "100%", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 8 }}
            >
              ← Tillbaka
            </button>
          </div>
        )}
      </div>
      <button
        onClick={signOut}
        style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 8 }}
      >
        Logga ut
      </button>
    </div>
  );
}

function Choice({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ fontSize: 32 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{desc}</div>
      </div>
    </button>
  );
}
