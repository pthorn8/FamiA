// components/Family.js
"use client";

import { useState, useEffect } from "react";
import { renameFamily, leaveFamily, updateMyName, setNotifPrefs, getNotifPrefs } from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import { useTheme } from "@/lib/ThemeContext";
import { memberColor } from "@/lib/colors";
import { enableNotifications, disableNotifications, notificationStatus } from "@/lib/notifications";
import Sheet from "./Sheet";

export default function Family({ familyId, family, user, onSignOut }) {
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState(family.name);
  const [showLeave, setShowLeave] = useState(false);
  const [notifState, setNotifState] = useState("default");
  const [notifBusy, setNotifBusy] = useState(false);
  const [showName, setShowName] = useState(false);
  const [notifPrefs, setNotifPrefsState] = useState({ chat: true, lists: true, calendar: true });
  const myMember = family.members?.find((m) => m.uid === user.uid);
  const [myNameValue, setMyNameValue] = useState(myMember?.name || user.displayName?.split(" ")[0] || "");

  useEffect(() => {
    notificationStatus().then(setNotifState);
    getNotifPrefs(user.uid).then(setNotifPrefsState);
  }, [user.uid]);

  const togglePref = async (key) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefsState(next);
    await setNotifPrefs(user, next);
  };

  const handleSaveMyName = async () => {
    if (myNameValue.trim() && myNameValue.trim() !== myMember?.name) {
      await updateMyName(user, myNameValue.trim());
      toast.show("Ditt namn uppdaterat");
    }
    setShowName(false);
  };

  const handleToggleNotif = async () => {
    setNotifBusy(true);
    try {
      if (notifState === "granted") {
        await disableNotifications(user);
        setNotifState("default");
      } else {
        const res = await enableNotifications(user);
        if (res.ok) {
          setNotifState("granted");
        } else if (res.reason === "denied") {
          setNotifState("denied");
        }
      }
    } finally {
      setNotifBusy(false);
    }
  };
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const toast = useToast();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      toast.show("Kod kopierad");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.show("Kunde inte kopiera", "error");
    }
  };

  const handleShare = async () => {
    const text = `Gå med i ${family.name} på Familjeappen med koden: ${family.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Inbjudan", text });
      } catch (e) {
        // användaren avbröt
      }
    } else {
      setShowShareSheet(true);
    }
  };

  const handleSaveName = async () => {
    if (nameValue.trim() && nameValue !== family.name) {
      await renameFamily(familyId, nameValue.trim(), user);
      toast.show("Namn uppdaterat");
    }
    setEditName(false);
  };

  const handleLeave = async () => {
    await leaveFamily(user, familyId);
    toast.show("Du lämnade familjen");
    setShowLeave(false);
  };

  return (
    <div>
      {/* Familjnamn */}
      <div style={{ marginBottom: 24 }}>
        {editName ? (
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            autoFocus
            style={{ width: "100%", fontSize: 24, fontFamily: "'DM Serif Display', Georgia, serif", border: "none", borderBottom: "2px solid var(--coral)", outline: "none", padding: "4px 0", background: "transparent" }}
          />
        ) : (
          <h2 onClick={() => setEditName(true)} className="serif" style={{ fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {family.name}
            <span style={{ fontSize: 14, color: "var(--muted-soft)" }}>✏️</span>
          </h2>
        )}
      </div>

      {/* Inbjudningskort */}
      <div
        style={{
          background: "var(--coral-soft)",
          borderRadius: 18,
          padding: 20,
          marginBottom: 28,
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Bjud in en till familjen</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          De anger den här koden när de skapar konto.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div
            onClick={copyCode}
            data-tappable
            style={{ flex: 1, background: "var(--surface)", borderRadius: 12, padding: "14px 16px", fontSize: 20, fontWeight: 800, letterSpacing: 2, color: "var(--coral)", textAlign: "center", cursor: "pointer", fontFamily: "monospace" }}
          >
            {family.inviteCode}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={copyCode}
            style={{ flex: 1, background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {copied ? "✓ Kopierad" : "📋 Kopiera"}
          </button>
          <button
            onClick={handleShare}
            style={{ flex: 1, background: "var(--coral)", color: "white", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            📤 Dela
          </button>
        </div>
      </div>

      {/* Medlemmar */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1, padding: "0 4px" }}>
        {family.members?.length || 0} medlemmar
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {family.members?.map((m) => (
          <MemberRow key={m.uid} member={m} isMe={m.uid === user.uid} />
        ))}
      </div>

      {/* Konto */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1, padding: "0 4px" }}>
        Inställningar
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => { setMyNameValue(myMember?.name || ""); setShowName(true); }} style={settingsRow}>
          <span>🙋</span>
          <span style={{ flex: 1, textAlign: "left" }}>Ditt namn</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{myMember?.name}</span>
          <span style={{ color: "var(--muted-soft)" }}>›</span>
        </button>
        <button onClick={() => setShowTheme(true)} style={settingsRow}>
          <span>{themeMode === "dark" ? "🌙" : themeMode === "light" ? "☀️" : "🌗"}</span>
          <span style={{ flex: 1, textAlign: "left" }}>Utseende</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {themeMode === "dark" ? "Mörkt" : themeMode === "light" ? "Ljust" : "Auto"}
          </span>
          <span style={{ color: "var(--muted-soft)" }}>›</span>
        </button>
        {notifState !== "unsupported" && (
          <button onClick={handleToggleNotif} disabled={notifBusy || notifState === "denied"} style={settingsRow}>
            <span>🔔</span>
            <span style={{ flex: 1, textAlign: "left" }}>Notiser</span>
            <span style={{ color: notifState === "granted" ? "var(--sage)" : "var(--muted)", fontSize: 13, fontWeight: 600 }}>
              {notifBusy ? "..." : notifState === "granted" ? "På" : notifState === "denied" ? "Blockerat" : "Av"}
            </span>
            {notifState !== "denied" && <span style={{ color: "var(--muted-soft)" }}>›</span>}
          </button>
        )}
        {notifState === "granted" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "4px 16px" }}>
            <PrefToggle label="💬 Nya meddelanden" on={notifPrefs.chat !== false} onToggle={() => togglePref("chat")} />
            <div style={{ height: 1, background: "var(--line-soft)" }} />
            <PrefToggle label="📋 Listor" on={notifPrefs.lists !== false} onToggle={() => togglePref("lists")} />
            <div style={{ height: 1, background: "var(--line-soft)" }} />
            <PrefToggle label="📅 Kalender" on={notifPrefs.calendar !== false} onToggle={() => togglePref("calendar")} />
          </div>
        )}
        <button
          onClick={() => setShowLeave(true)}
          style={settingsRow}
        >
          <span>🚪</span>
          <span style={{ flex: 1, textAlign: "left" }}>Lämna familjen</span>
          <span style={{ color: "var(--muted-soft)" }}>›</span>
        </button>
        <button
          onClick={onSignOut}
          style={settingsRow}
        >
          <span>👋</span>
          <span style={{ flex: 1, textAlign: "left" }}>Logga ut</span>
          <span style={{ color: "var(--muted-soft)" }}>›</span>
        </button>
      </div>
      {notifState === "denied" && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, padding: "0 4px", lineHeight: 1.5 }}>
          Notiser är blockerade i webbläsaren. Tillåt dem i telefonens inställningar för appen om du vill slå på dem.
        </p>
      )}

      <div style={{ fontSize: 11, color: "var(--muted-soft)", textAlign: "center", marginTop: 28 }}>
        Familjeappen · v1.0
      </div>

      {showName && (
        <Sheet onClose={() => setShowName(false)}>
          <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Ditt namn</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Så här ser de andra i familjen dig.
          </p>
          <input
            value={myNameValue}
            onChange={(e) => setMyNameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveMyName()}
            autoFocus
            placeholder="Ditt namn"
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", marginBottom: 16, background: "var(--surface)", color: "var(--ink)" }}
          />
          <button
            onClick={handleSaveMyName}
            style={{ width: "100%", background: "var(--coral)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 15, cursor: "pointer" }}
          >
            Spara
          </button>
        </Sheet>
      )}

      {showLeave && (
        <Sheet onClose={() => setShowLeave(false)}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚪</div>
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 8 }}>Lämna familjen?</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, maxWidth: 300, margin: "0 auto" }}>
              Du kommer inte längre se {family.name}s listor och kalender. Du kan gå tillbaka om någon ger dig koden igen.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowLeave(false)} style={{ flex: 1, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Avbryt
            </button>
            <button onClick={handleLeave} style={{ flex: 1, background: "var(--coral)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Lämna
            </button>
          </div>
        </Sheet>
      )}

      {showShareSheet && (
        <Sheet onClose={() => setShowShareSheet(false)}>
          <h3 className="serif" style={{ fontSize: 20, marginBottom: 16 }}>Dela inbjudan</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
            Skicka det här meddelandet till någon du vill bjuda in:
          </p>
          <div style={{ background: "var(--surface-soft)", padding: 16, borderRadius: 12, fontSize: 14, lineHeight: 1.6, marginBottom: 16, border: "1px solid var(--line)" }}>
            Gå med i <strong>{family.name}</strong> på Familjeappen med koden: <strong style={{ color: "var(--coral)" }}>{family.inviteCode}</strong>
          </div>
          <button
            onClick={async () => {
              const text = `Gå med i ${family.name} på Familjeappen med koden: ${family.inviteCode}`;
              await navigator.clipboard?.writeText(text);
              toast.show("Meddelande kopierat");
              setShowShareSheet(false);
            }}
            style={{ width: "100%", background: "var(--coral)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 15, cursor: "pointer" }}
          >
            Kopiera meddelande
          </button>
        </Sheet>
      )}

      {showTheme && (
        <Sheet onClose={() => setShowTheme(false)}>
          <h3 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Utseende</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
            Välj hur appen ska se ut.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { value: "system", label: "Automatiskt", desc: "Följer telefonens inställning", icon: "🌗" },
              { value: "light", label: "Ljust", desc: "Alltid ljust läge", icon: "☀️" },
              { value: "dark", label: "Mörkt", desc: "Alltid mörkt läge", icon: "🌙" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setThemeMode(opt.value); setShowTheme(false); toast.show("Utseende uppdaterat"); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: themeMode === opt.value ? "var(--coral-soft)" : "var(--surface)",
                  border: `1px solid ${themeMode === opt.value ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  color: "var(--ink)",
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{opt.desc}</div>
                </div>
                {themeMode === opt.value && <span style={{ color: "var(--coral)", fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function PrefToggle({ label, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", background: "none", border: "none", cursor: "pointer", width: "100%", color: "var(--ink)" }}
    >
      <span style={{ flex: 1, textAlign: "left", fontSize: 14 }}>{label}</span>
      <span
        style={{
          width: 42,
          height: 25,
          borderRadius: 13,
          background: on ? "var(--sage)" : "var(--line)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 20 : 3,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </span>
    </button>
  );
}

function MemberRow({ member, isMe }) {
  const color = memberColor(member);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--line)" }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", flexShrink: 0, color: "white", fontWeight: 700 }}>
        {member.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoURL} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          member.name?.[0]?.toUpperCase() || "?"
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
          {member.name}
          {isMe && <span style={{ fontSize: 11, color: "var(--coral)", background: "var(--coral-soft)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>DU</span>}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{member.role}</div>
      </div>
    </div>
  );
}

const settingsRow = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 16px",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  width: "100%",
  color: "var(--ink)",
};
