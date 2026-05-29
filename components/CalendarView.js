// components/CalendarView.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { watchEvents, createEvent, deleteEvent, expandEvents } from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import Sheet from "./Sheet";

const COLORS = [
  { value: "#E07A5F", name: "Korall" },
  { value: "#81B29A", name: "Salvia" },
  { value: "#F2CC8F", name: "Sand" },
  { value: "#3D405B", name: "Marin" },
  { value: "#9B7EBD", name: "Lila" },
];
const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const RECURRENCE_OPTIONS = [
  { value: "", label: "En gång" },
  { value: "daily", label: "Varje dag" },
  { value: "weekly", label: "Varje vecka" },
  { value: "monthly", label: "Varje månad" },
  { value: "yearly", label: "Varje år" },
];

export default function CalendarView({ familyId, user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const unsub = watchEvents(familyId, (e) => { setEvents(e); setLoading(false); });
    return () => unsub();
  }, [familyId]);

  const { year, month } = cursor;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayISOStr = today.toISOString().slice(0, 10);

  // Expandera återkommande händelser för den synliga månaden
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const expanded = useMemo(() => expandEvents(events, monthStart, monthEnd), [events, monthStart, monthEnd]);

  const dateKey = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const eventsOn = (day) => expanded.filter((e) => e._date === dateKey(day));

  const move = (delta) => {
    setSelected(null);
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(d.getDate());
  };

  // Kommande händelser från idag och 30 dagar framåt
  const upcoming = useMemo(() => {
    const from = todayISOStr;
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 30);
    const to = toDate.toISOString().slice(0, 10);
    const expandedAll = expandEvents(events, from, to);
    return expandedAll
      .sort((a, b) => (a._date + (a.time || "")).localeCompare(b._date + (b.time || "")))
      .slice(0, 8);
  }, [events, todayISOStr]);

  const selectedEvents = selected ? eventsOn(selected) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 22, textTransform: "capitalize" }}>
          {MONTHS[month]} {year}
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          <NavBtn onClick={() => move(-1)}>‹</NavBtn>
          <button
            onClick={goToToday}
            style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8, padding: "0 12px", height: 34, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ink)" }}
          >
            Idag
          </button>
          <NavBtn onClick={() => move(1)}>›</NavBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)", padding: "6px 0", letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const evts = eventsOn(day);
          const isSel = selected === day;
          const isToday = isThisMonth && today.getDate() === day;
          return (
            <button
              key={day}
              onClick={() => setSelected(isSel ? null : day)}
              style={{
                aspectRatio: "1",
                borderRadius: 11,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                cursor: "pointer",
                background: isSel ? "var(--coral)" : isToday ? "var(--coral-soft)" : "var(--surface)",
                border: isSel ? "none" : isToday ? "2px solid var(--coral)" : "1px solid var(--line-soft)",
                padding: 0,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isSel ? "white" : "var(--ink)" }}>
                {day}
              </span>
              {evts.length > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {evts.slice(0, 3).map((e, i) => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "white" : e.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null ? (
        <div style={{ marginTop: 20, animation: "slideIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              {selected} {MONTHS[month]}
            </span>
            <button
              onClick={() => setShowNew(true)}
              style={{ background: "var(--coral)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Händelse
            </button>
          </div>

          {selectedEvents.map((evt, i) => (
            <EventRow key={`${evt.id}-${i}`} event={evt} onClick={() => setEditing(evt)} />
          ))}
          {selectedEvents.length === 0 && (
            <p style={{ color: "var(--muted-soft)", textAlign: "center", padding: 20, fontSize: 14 }}>
              Inga händelser den här dagen
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              Kommande
            </span>
            <button
              onClick={() => setShowNew(true)}
              style={{ background: "var(--coral)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Händelse
            </button>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 8 }} />
          ) : upcoming.length === 0 ? (
            <p style={{ color: "var(--muted-soft)", textAlign: "center", padding: 30, fontSize: 14 }}>
              Inga kommande händelser
            </p>
          ) : (
            upcoming.map((evt, i) => (
              <EventRow key={`${evt.id}-${i}`} event={evt} showDate onClick={() => setEditing(evt)} />
            ))
          )}
        </div>
      )}

      {showNew && (
        <EventSheet
          defaultDate={selected ? dateKey(selected) : todayISOStr}
          onClose={() => setShowNew(false)}
          onSave={async (event) => {
            await createEvent(familyId, event, user);
            setShowNew(false);
          }}
        />
      )}

      {editing && (
        <EventSheet
          event={editing}
          onClose={() => setEditing(null)}
          onDelete={async () => {
            await deleteEvent(familyId, editing.id, editing.title, user);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EventRow({ event, onClick, showDate }) {
  return (
    <div
      onClick={onClick}
      data-tappable
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "var(--surface)",
        borderRadius: 12,
        border: "1px solid var(--line)",
        marginBottom: 6,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: event.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {showDate && <>{formatEventDate(event._date)} · </>}
          {event.time && <>{event.time} · </>}
          av {event.by}
          {event.recurrence && <> · 🔁</>}
        </div>
      </div>
      <span style={{ color: "#ccc", fontSize: 18 }}>›</span>
    </div>
  );
}

function EventSheet({ event, defaultDate, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event?._date || event?.date || defaultDate || "");
  const [time, setTime] = useState(event?.time || "");
  const [color, setColor] = useState(event?.color || COLORS[0].value);
  const [recurrence, setRecurrence] = useState(event?.recurrence || "");
  const toast = useToast();
  const isEdit = !!event;

  const handleSave = async () => {
    if (!title.trim() || !date) {
      toast.show("Fyll i titel och datum", "error");
      return;
    }
    if (onSave) {
      await onSave({ title: title.trim(), date, time: time || "", color, recurrence: recurrence || null });
      toast.show("Sparat");
    }
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>
        {isEdit ? "Händelse" : "Ny händelse"}
      </h3>

      {!isEdit && (
        <>
          <label style={fieldLabel}>Vad händer?</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="t.ex. Tandläkartid"
            autoFocus
            style={sheetInput}
          />

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...sheetInput, marginBottom: 0 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Tid</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ ...sheetInput, marginBottom: 0 }}
              />
            </div>
          </div>

          <label style={fieldLabel}>Återkommer</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRecurrence(opt.value)}
                style={{
                  background: recurrence === opt.value ? "var(--coral)" : "var(--surface)",
                  color: recurrence === opt.value ? "white" : "var(--ink)",
                  border: `1px solid ${recurrence === opt.value ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 20,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label style={fieldLabel}>Färg</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: color === c.value ? "3px solid white" : "3px solid transparent",
                  boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : "none",
                  background: c.value,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          <button
            onClick={handleSave}
            style={{ width: "100%", background: "var(--coral)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 15, cursor: "pointer" }}
          >
            Spara händelse
          </button>
        </>
      )}

      {isEdit && (
        <>
          <div style={{ background: "var(--surface-soft)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 4, height: 36, borderRadius: 4, background: event.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{event.title}</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>
                  {formatEventDate(event._date || event.date)}
                  {event.time && ` · ${event.time}`}
                </div>
              </div>
            </div>
            {event.recurrence && (
              <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                🔁 {{ daily: "Varje dag", weekly: "Varje vecka", monthly: "Varje månad", yearly: "Varje år" }[event.recurrence]}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--muted-soft)", marginTop: 8 }}>
              Tillagd av {event.by}
            </div>
          </div>

          <button
            onClick={async () => {
              if (confirm(event.recurrence ? "Ta bort hela serien?" : "Ta bort händelsen?")) {
                await onDelete();
                toast.show("Borttagen");
              }
            }}
            style={{ width: "100%", background: "var(--coral-soft)", color: "var(--coral)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            🗑️ Ta bort
          </button>
        </>
      )}
    </Sheet>
  );
}

function NavBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

function formatEventDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const days = Math.round((cmp - today) / 86400000);
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  if (days === -1) return "Igår";
  if (days > 0 && days < 7) {
    return d.toLocaleDateString("sv-SE", { weekday: "long" });
  }
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

const fieldLabel = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
  color: "var(--ink-soft)",
};

const sheetInput = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
  marginBottom: 16,
  background: "var(--surface)",
};
