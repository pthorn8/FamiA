// app/page.js
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { watchUserFamily, watchUserFamilies, switchFamily, createFamily, joinFamily, watchMessages } from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import { nameColor } from "@/lib/colors";
import Login from "@/components/Login";
import Onboarding from "@/components/Onboarding";
import Dashboard from "@/components/Dashboard";
import Lists from "@/components/Lists";
import CalendarView from "@/components/CalendarView";
import Family from "@/components/Family";
import ActivityFeed from "@/components/ActivityFeed";
import Chat from "@/components/Chat";
import Sheet from "@/components/Sheet";
import Search from "@/components/Search";

const TABS = [
  { name: "Hem", icon: "🏡" },
  { name: "Listor", icon: "📋" },
  { name: "Kalender", icon: "📅" },
  { name: "Chatt", icon: "💬" },
  { name: "Aktivitet", icon: "🔔" },
  { name: "Familj", icon: "👥" },
];

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const toast = useToast();
  const [familyId, setFamilyId] = useState(undefined);
  const [families, setFamilies] = useState([]);
  const [tab, setTab] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [lastSeenAt, setLastSeenAt] = useState(0);

  useEffect(() => {
    if (!user) {
      setFamilyId(undefined);
      setFamilies([]);
      return;
    }
    const u1 = watchUserFamily(user.uid, setFamilyId);
    const u2 = watchUserFamilies(user.uid, setFamilies);
    return () => { u1(); u2(); };
  }, [user]);

  // Lyssna på senaste meddelandet för olästa-pricken
  useEffect(() => {
    if (!familyId || typeof familyId !== "string") {
      setLastMessage(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`chat-seen-${familyId}`);
      setLastSeenAt(saved ? Number(saved) : 0);
    } catch (e) {}
    const unsub = watchMessages(familyId, (msgs) => {
      setLastMessage(msgs.length ? msgs[msgs.length - 1] : null);
    }, 1);
    return () => unsub();
  }, [familyId]);

  const markChatSeen = (seconds) => {
    const ts = seconds || Date.now() / 1000;
    setLastSeenAt(ts);
    try {
      if (familyId) localStorage.setItem(`chat-seen-${familyId}`, String(ts));
    } catch (e) {}
  };

  if (loading) return <Centered><div className="spinner" /></Centered>;
  if (!user) return <Login />;
  if (familyId === undefined) return <Centered><div className="spinner" /></Centered>;

  // Användaren tillhör inga familjer
  if (familyId === null && families.length === 0) {
    return <Onboarding user={user} />;
  }

  // Användaren har lämnat sin senaste familj men finns kvar i andra
  const activeFamily = families.find((f) => f.id === familyId) || families[0];
  if (!activeFamily) return <Onboarding user={user} />;

  // Oläst chatt: senaste meddelandet är nyare än senast sett, och inte från mig själv
  const chatUnread =
    lastMessage &&
    lastMessage.senderId !== user.uid &&
    (lastMessage.at?.seconds || 0) > lastSeenAt &&
    tab !== 3;

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      <Header
        user={user}
        family={activeFamily}
        familyCount={families.length}
        onSwitchClick={() => setSwitcherOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      {tab === 3 ? (
        <Chat familyId={activeFamily.id} user={user} onSeen={markChatSeen} />
      ) : (
        <div style={{ padding: "20px 18px 110px", animation: "slideIn 0.25s ease" }}>
          {tab === 0 && <Dashboard familyId={activeFamily.id} family={activeFamily} user={user} onOpenTab={setTab} />}
          {tab === 1 && <Lists familyId={activeFamily.id} user={user} family={activeFamily} />}
          {tab === 2 && <CalendarView familyId={activeFamily.id} user={user} />}
          {tab === 4 && <ActivityFeed familyId={activeFamily.id} />}
          {tab === 5 && <Family familyId={activeFamily.id} family={activeFamily} user={user} onSignOut={signOut} />}
        </div>
      )}

      <TabBar
        tabs={TABS}
        active={tab}
        onChange={(t) => {
          if (t === 3 && lastMessage) markChatSeen(lastMessage.at?.seconds);
          setTab(t);
        }}
        badgeIndex={chatUnread ? 3 : -1}
      />

      {switcherOpen && (
        <FamilySwitcher
          families={families}
          activeId={activeFamily.id}
          user={user}
          onSwitch={async (id) => {
            await switchFamily(user, id);
            setSwitcherOpen(false);
            toast.show("Bytte familj");
          }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}

      {searchOpen && (
        <Search
          familyId={activeFamily.id}
          onClose={() => setSearchOpen(false)}
          onJumpToTab={setTab}
        />
      )}
    </div>
  );
}

function Header({ user, family, familyCount, onSwitchClick, onSearchClick }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)",
        padding: "26px 20px 18px",
        color: "var(--header-text)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 2 }}>
          Hej {user.displayName?.split(" ")[0] || "där"} 👋
        </div>
        <button
          onClick={onSwitchClick}
          disabled={familyCount < 2}
          style={{
            background: "none",
            border: "none",
            color: "var(--header-text)",
            padding: 0,
            cursor: familyCount > 1 ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: 6,
            maxWidth: "100%",
          }}
        >
          <span
            className="serif"
            style={{
              fontSize: 22,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {family.name}
          </span>
          {familyCount > 1 && (
            <span style={{ fontSize: 14, opacity: 0.6 }}>▾</span>
          )}
        </button>
      </div>
      <button
        onClick={onSearchClick}
        aria-label="Sök"
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "none",
          borderRadius: "50%",
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          cursor: "pointer",
          color: "var(--header-text)",
          flexShrink: 0,
        }}
      >
        🔍
      </button>
      <Avatar user={user} />
    </div>
  );
}

function Avatar({ user }) {
  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt=""
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.2)",
        }}
      />
    );
  }
  const name = user.displayName || user.email || "?";
  const initial = name[0].toUpperCase();
  const c = nameColor(name.split(" ")[0]);
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: c.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 16,
        color: "white",
        border: "2px solid rgba(255,255,255,0.2)",
      }}
    >
      {initial}
    </div>
  );
}

function TabBar({ tabs, active, onChange, badgeIndex = -1 }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: "var(--tab-bar)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderTop: "1px solid var(--line)",
        display: "flex",
        padding: "8px 0 max(env(safe-area-inset-bottom, 8px), 8px)",
        zIndex: 100,
      }}
    >
      {tabs.map((t, i) => {
        const isActive = active === i;
        const showBadge = i === badgeIndex;
        return (
          <button
            key={t.name}
            onClick={() => onChange(i)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0",
            }}
          >
            <span style={{
              position: "relative",
              fontSize: 20,
              filter: isActive ? "none" : "grayscale(0.5)",
              opacity: isActive ? 1 : 0.5,
              transform: isActive ? "translateY(-1px) scale(1.08)" : "translateY(0) scale(1)",
              transition: "transform 0.25s cubic-bezier(0.2,0.8,0.3,1), opacity 0.2s ease, filter 0.2s ease",
            }}>
              {t.icon}
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -5,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "var(--coral)",
                    border: "1.5px solid var(--tab-bar)",
                  }}
                />
              )}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--coral)" : "var(--muted)",
                letterSpacing: 0.1,
                transition: "color 0.2s ease",
              }}
            >
              {t.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FamilySwitcher({ families, activeId, user, onSwitch, onClose }) {
  const [adding, setAdding] = useState(null); // "create" | "join" | null
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      if (adding === "create") {
        await createFamily(user, value.trim());
        toast.show("Ny familj skapad");
      } else {
        await joinFamily(user, value);
        toast.show("Gick med i familjen");
      }
      onClose();
    } catch (e) {
      toast.show(e.message || "Något gick fel", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Dina familjer</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Byt mellan dina grupper.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {families.map((f) => (
          <button
            key={f.id}
            onClick={() => onSwitch(f.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: f.id === activeId ? "var(--coral-soft)" : "var(--surface-soft)",
              border: `1px solid ${f.id === activeId ? "var(--coral)" : "var(--line)"}`,
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {f.members?.length || 0} medlemmar
              </div>
            </div>
            {f.id === activeId && <span style={{ color: "var(--coral)", fontSize: 18 }}>●</span>}
          </button>
        ))}
      </div>

      {!adding && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setAdding("create")}
            style={{
              flex: 1,
              background: "var(--coral)",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Skapa familj
          </button>
          <button
            onClick={() => setAdding("join")}
            style={{
              flex: 1,
              background: "var(--surface-soft)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            🔗 Gå med
          </button>
        </div>
      )}

      {adding && (
        <div style={{ animation: "slideIn 0.2s ease" }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={adding === "create" ? "Familjens namn" : "Inbjudningskod"}
            autoFocus
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 15,
              outline: "none",
              marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setAdding(null); setValue(""); }}
              style={{
                flex: 1,
                background: "var(--surface-soft)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Avbryt
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              style={{
                flex: 2,
                background: "var(--coral)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "12px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Vänta..." : (adding === "create" ? "Skapa" : "Gå med")}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Centered({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      {children}
    </div>
  );
}
