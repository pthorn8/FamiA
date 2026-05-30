// components/Dashboard.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { watchLists, watchEvents, watchActivity, expandEvents, toggleListItem } from "@/lib/data";
import { memberColor, nameColor } from "@/lib/colors";
import Sheet from "./Sheet";

export default function Dashboard({ familyId, family, user, onOpenTab }) {
  const [lists, setLists] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // "todo" | "today" | "due" | null

  useEffect(() => {
    let count = 0;
    const done = () => { count++; if (count >= 3) setLoading(false); };
    const u1 = watchLists(familyId, (l) => { setLists(l); done(); });
    const u2 = watchEvents(familyId, (e) => { setEvents(e); done(); });
    const u3 = watchActivity(familyId, (a) => { setActivity(a); done(); }, 5);
    return () => { u1(); u2(); u3(); };
  }, [familyId]);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Saker som ska göras idag eller är försenade
  const todoToday = useMemo(() => {
    const items = [];
    for (const list of lists) {
      for (const item of list.items || []) {
        if (item.done) continue;
        if (item.dueDate && item.dueDate <= todayISO) {
          items.push({ ...item, listId: list.id, listName: list.name, listIcon: list.icon });
        }
      }
    }
    return items.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [lists, todayISO]);

  // Dagens händelser (inklusive återkommande)
  const todayEvents = useMemo(() => {
    return expandEvents(events, todayISO, todayISO).sort((a, b) =>
      (a.time || "99:99").localeCompare(b.time || "99:99")
    );
  }, [events, todayISO]);

  // Kommande händelser de närmsta dagarna (inte idag)
  const upcomingEvents = useMemo(() => {
    const start = new Date(todayISO);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const range = expandEvents(events, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    return range.sort((a, b) => (a._date + (a.time || "")).localeCompare(b._date + (b.time || ""))).slice(0, 3);
  }, [events, todayISO]);

  // Statistik
  const stats = useMemo(() => {
    let activeItems = 0;
    let totalItems = 0;
    for (const list of lists) {
      for (const item of list.items || []) {
        totalItems++;
        if (!item.done) activeItems++;
      }
    }
    return { activeItems, totalItems, lists: lists.length };
  }, [lists]);

  // Alla aktiva (ej klara) uppgifter, för "Att göra"-detaljen
  const allActive = useMemo(() => {
    const items = [];
    for (const list of lists) {
      for (const item of list.items || []) {
        if (!item.done) {
          items.push({ ...item, listId: list.id, listName: list.name, listIcon: list.icon });
        }
      }
    }
    // Sortera: förfallodatum först, sen de utan datum
    return items.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [lists]);

  const toggleItem = (item) =>
    toggleListItem(familyId, lists.find((l) => l.id === item.listId), item.id, user);

  const greeting = getGreeting(user);

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 80, marginBottom: 16, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ animation: "slideIn 0.25s ease" }}>
      {/* Hälsning */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="serif" style={{ fontSize: 26, lineHeight: 1.15, marginBottom: 4 }}>
          {greeting.text}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          {greeting.sub}
        </p>
      </div>

      {/* Snabb-statistik */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatCard label="Att göra" value={stats.activeItems} icon="📋" onClick={() => setDetail("todo")} />
        <StatCard label="Idag" value={todayEvents.length} icon="📅" onClick={() => setDetail("today")} />
        <StatCard label="Förfaller" value={todoToday.length} icon="⏰" highlight={todoToday.length > 0} onClick={() => setDetail("due")} />
      </div>

      {/* Idag-händelser */}
      {todayEvents.length > 0 && (
        <Section title="Idag" onSeeAll={() => onOpenTab(2)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayEvents.map((evt, i) => (
              <EventRow key={`${evt.id}-${i}`} event={evt} />
            ))}
          </div>
        </Section>
      )}

      {/* Förfaller-uppgifter */}
      {todoToday.length > 0 && (
        <Section title="Behöver göras" onSeeAll={() => onOpenTab(1)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todoToday.slice(0, 5).map((item) => (
              <TodoRow
                key={item.id}
                item={item}
                onToggle={() =>
                  toggleListItem(familyId, lists.find((l) => l.id === item.listId), item.id, user)
                }
              />
            ))}
            {todoToday.length > 5 && (
              <button
                onClick={() => onOpenTab(1)}
                style={{ background: "none", border: "none", color: "var(--coral)", fontSize: 13, fontWeight: 600, padding: 8, cursor: "pointer" }}
              >
                +{todoToday.length - 5} till →
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Kommande händelser */}
      {upcomingEvents.length > 0 && (
        <Section title="Snart" onSeeAll={() => onOpenTab(2)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upcomingEvents.map((evt, i) => (
              <EventRow key={`${evt.id}-${i}`} event={evt} showDate />
            ))}
          </div>
        </Section>
      )}

      {/* Senaste aktivitet */}
      {activity.length > 0 && (
        <Section title="Senaste händer" onSeeAll={() => onOpenTab(4)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activity.slice(0, 3).map((item) => (
              <ActivityPreview key={item.id} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* Tom-läge */}
      {todoToday.length === 0 && todayEvents.length === 0 && upcomingEvents.length === 0 && activity.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 12, opacity: 0.6 }}>🌿</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Lugn dag</div>
          <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280, margin: "0 auto" }}>
            Inget förfaller, inga händelser. Kanske dags att lägga till något i en lista?
          </div>
          <button
            onClick={() => onOpenTab(1)}
            style={{ marginTop: 20, background: "var(--coral)", color: "white", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Öppna listor
          </button>
        </div>
      )}

      {detail && (
        <DetailSheet
          type={detail}
          allActive={allActive}
          todayEvents={todayEvents}
          dueItems={todoToday}
          onToggle={toggleItem}
          onClose={() => setDetail(null)}
          onOpenTab={(t) => { setDetail(null); onOpenTab(t); }}
        />
      )}
    </div>
  );
}

function DetailSheet({ type, allActive, todayEvents, dueItems, onToggle, onClose, onOpenTab }) {
  const config = {
    todo: { title: "Att göra", icon: "📋", empty: "Inga aktiva uppgifter. Allt är klart!", tab: 1 },
    today: { title: "Idag", icon: "📅", empty: "Inga händelser idag.", tab: 2 },
    due: { title: "Förfaller", icon: "⏰", empty: "Inget förfaller just nu.", tab: 1 },
  }[type];

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 24 }}>{config.icon}</span>
        <h3 className="serif" style={{ fontSize: 22 }}>{config.title}</h3>
      </div>

      {type === "today" ? (
        todayEvents.length === 0 ? (
          <EmptyDetail text={config.empty} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayEvents.map((evt, i) => <EventRow key={`${evt.id}-${i}`} event={evt} />)}
          </div>
        )
      ) : (
        (() => {
          const items = type === "todo" ? allActive : dueItems;
          if (items.length === 0) return <EmptyDetail text={config.empty} />;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item) => (
                <TodoRow key={`${item.listId}-${item.id}`} item={item} onToggle={() => onToggle(item)} />
              ))}
            </div>
          );
        })()
      )}

      <button
        onClick={() => onOpenTab(config.tab)}
        style={{ width: "100%", marginTop: 16, background: "var(--surface-soft)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
      >
        Öppna {config.tab === 1 ? "listor" : "kalender"} →
      </button>
    </Sheet>
  );
}

function EmptyDetail({ text }) {
  return (
    <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>✨</div>
      <div style={{ fontSize: 14, maxWidth: 240, margin: "0 auto" }}>{text}</div>
    </div>
  );
}

function Section({ title, onSeeAll, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          {title}
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{ background: "none", border: "none", color: "var(--coral)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4 }}
          >
            Se allt →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, highlight, onClick }) {
  return (
    <button
      onClick={onClick}
      data-tappable
      style={{
        flex: 1,
        background: highlight ? "var(--coral-soft)" : "var(--surface)",
        border: `1px solid ${highlight ? "var(--coral)" : "var(--line)"}`,
        borderRadius: 14,
        padding: "12px 10px",
        textAlign: "center",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "var(--coral)" : "var(--ink)", fontFamily: "'DM Serif Display', Georgia, serif" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.3 }}>
        {label}
      </div>
    </button>
  );
}

function EventRow({ event, showDate }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        borderRadius: 12,
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ width: 4, height: 32, borderRadius: 4, background: event.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {showDate && <>{formatRelDate(event._date)}{event.time && " · "}</>}
          {event.time}
          {event.recurrence && " · 🔁"}
        </div>
      </div>
    </div>
  );
}

function TodoRow({ item, onToggle }) {
  const overdue = item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10);
  const assigneeColor = item.assignedTo ? nameColor(item.assignedTo) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        borderRadius: 12,
        border: `1px solid ${overdue ? "var(--coral)" : "var(--line)"}`,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          border: "2px solid var(--muted-soft)",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Markera klar"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.text}
        </div>
        <div style={{ fontSize: 11, color: overdue ? "var(--coral)" : "var(--muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span>{item.listIcon || "📋"} {item.listName}</span>
          {item.dueDate && (
            <>
              <span>·</span>
              <span style={{ fontWeight: 600 }}>{formatRelDate(item.dueDate)}</span>
            </>
          )}
        </div>
      </div>
      {item.assignedTo && (
        <div
          title={item.assignedTo}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: assigneeColor.bg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {item.assignedTo[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function ActivityPreview({ item }) {
  const color = nameColor(item.by?.name || "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: color.soft, color: color.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 600 }}>{item.by?.name}</span>{" "}
        <span style={{ color: "var(--ink-soft)" }}>{item.text}</span>
      </div>
    </div>
  );
}

function getGreeting(user) {
  const h = new Date().getHours();
  const name = user.displayName?.split(" ")[0] || "där";
  const greeting =
    h < 5 ? "God natt" :
    h < 10 ? "God morgon" :
    h < 13 ? "Hej" :
    h < 17 ? "God eftermiddag" :
    h < 22 ? "God kväll" :
    "God natt";
  const subs = [
    "Här är dagens översikt",
    "Allt på ett ställe",
    "Vad händer idag?",
    "Dags att fixa dagen",
  ];
  const sub = subs[new Date().getDate() % subs.length];
  return { text: `${greeting}, ${name}`, sub };
}

function formatRelDate(iso) {
  if (!iso) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  if (days === -1) return "Igår";
  if (days < 0) return `${Math.abs(days)} dagar sedan`;
  if (days < 7) return d.toLocaleDateString("sv-SE", { weekday: "long" });
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}
