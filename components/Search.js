// components/Search.js
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { watchLists, watchEvents, expandEvents } from "@/lib/data";

export default function Search({ familyId, onClose, onJumpToTab }) {
  const [lists, setLists] = useState([]);
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const u1 = watchLists(familyId, setLists);
    const u2 = watchEvents(familyId, setEvents);
    return () => { u1(); u2(); };
  }, [familyId]);

  useEffect(() => {
    // Fokusera input direkt när sökningen öppnas
    setTimeout(() => inputRef.current?.focus(), 50);
    // Stäng vid Escape
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { items: [], events: [] };

    // Sök i listobjekt
    const itemHits = [];
    for (const list of lists) {
      for (const item of list.items || []) {
        const haystack = [item.text, item.assignedTo].filter(Boolean).join(" ").toLowerCase();
        if (haystack.includes(q)) {
          itemHits.push({ ...item, listName: list.name, listIcon: list.icon, listId: list.id });
        }
      }
    }

    // Sök i händelser. Expandera ett rimligt fönster för att fånga återkommande.
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();
    toDate.setFullYear(toDate.getFullYear() + 1);
    const expanded = expandEvents(events, fromDate.toISOString().slice(0, 10), toDate.toISOString().slice(0, 10));
    // Deduplicera på event-id eftersom återkommande ger många instanser. Behåll bara närmast framtida.
    const todayStr = new Date().toISOString().slice(0, 10);
    const byId = new Map();
    for (const evt of expanded) {
      if (!(evt.title || "").toLowerCase().includes(q)) continue;
      const existing = byId.get(evt.id);
      const isFuture = evt._date >= todayStr;
      if (!existing) {
        byId.set(evt.id, evt);
      } else {
        const existingFuture = existing._date >= todayStr;
        if (isFuture && !existingFuture) byId.set(evt.id, evt);
        else if (isFuture && existingFuture && evt._date < existing._date) byId.set(evt.id, evt);
      }
    }
    const eventHits = Array.from(byId.values()).sort((a, b) => a._date.localeCompare(b._date));

    return { items: itemHits, events: eventHits };
  }, [query, lists, events]);

  const total = results.items.length + results.events.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.15s ease",
      }}
    >
      {/* Sökhuvud */}
      <div
        style={{
          padding: "max(env(safe-area-inset-top, 12px), 12px) 16px 12px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "var(--surface-soft)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid var(--line)",
          }}
        >
          <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök i listor och kalender..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 15,
              outline: "none",
              color: "var(--ink)",
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, padding: 0, width: 22, height: 22 }}
              aria-label="Rensa sökning"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--coral)", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "4px 4px" }}
        >
          Avbryt
        </button>
      </div>

      {/* Resultat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {!query.trim() ? (
          <EmptyHint />
        ) : total === 0 ? (
          <NoResults query={query} />
        ) : (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {results.items.length > 0 && (
              <ResultSection title={`Listor (${results.items.length})`}>
                {results.items.map((item) => (
                  <ItemResult
                    key={`${item.listId}-${item.id}`}
                    item={item}
                    onClick={() => { onJumpToTab(1); onClose(); }}
                  />
                ))}
              </ResultSection>
            )}
            {results.events.length > 0 && (
              <ResultSection title={`Kalender (${results.events.length})`}>
                {results.events.map((evt) => (
                  <EventResult
                    key={`${evt.id}-${evt._date}`}
                    event={evt}
                    onClick={() => { onJumpToTab(2); onClose(); }}
                  />
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, padding: "0 4px" }}>
        {title}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
        {React.Children.toArray(children).map((child, i, arr) => (
          <div key={i} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemResult({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{item.listIcon || "📋"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.text}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {item.listName}
          {item.assignedTo && ` · 👤 ${item.assignedTo}`}
          {item.done && ` · klart`}
        </div>
      </div>
      <span style={{ color: "var(--muted-soft)", fontSize: 18 }}>›</span>
    </button>
  );
}

function EventResult({ event, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--surface)",
        border: "none",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: event.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {formatDate(event._date)}
          {event.time && ` · ${event.time}`}
          {event.recurrence && ` · 🔁`}
        </div>
      </div>
      <span style={{ color: "var(--muted-soft)", fontSize: 18 }}>›</span>
    </button>
  );
}

function EmptyHint() {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🔍</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
        Sök efter saker i dina listor eller händelser i kalendern.
      </div>
    </div>
  );
}

function NoResults({ query }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🤷</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
        Inga träffar för "{query}"
      </div>
      <div style={{ fontSize: 13 }}>Prova med ett annat ord.</div>
    </div>
  );
}

function formatDate(iso) {
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
  return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
}
