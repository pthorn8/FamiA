// components/ActivityFeed.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { watchActivity } from "@/lib/data";
import { nameColor } from "@/lib/colors";

export default function ActivityFeed({ familyId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchActivity(familyId, (i) => { setItems(i); setLoading(false); }, 50);
    return () => unsub();
  }, [familyId]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  // Statistik den här veckan
  const weekStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const recent = items.filter((i) => {
      const d = i.at?.toDate?.();
      return d && d >= weekAgo;
    });
    const byPerson = new Map();
    let completed = 0;
    for (const item of recent) {
      const name = item.by?.name || "Någon";
      byPerson.set(name, (byPerson.get(name) || 0) + 1);
      if (item.emoji === "✅") completed++;
    }
    const topPerson = [...byPerson.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total: recent.length, completed, topPerson: topPerson?.[0], topCount: topPerson?.[1] || 0 };
  }, [items]);

  if (loading) {
    return (
      <div>
        <h2 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>Aktivitet</h2>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>Aktivitet</h2>

      {weekStats.total > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 16,
          }}
        >
          <StatBlock label="Senaste 7 dagarna" value={weekStats.total} suffix="händelser" />
          <div style={{ width: 1, background: "var(--line)" }} />
          <StatBlock label="Avbockat" value={weekStats.completed} suffix="saker" emoji="✅" />
          {weekStats.topPerson && (
            <>
              <div style={{ width: 1, background: "var(--line)" }} />
              <StatBlock
                label="Mest aktiv"
                value={weekStats.topPerson}
                suffix={`${weekStats.topCount} ${weekStats.topCount === 1 ? "händelse" : "händelser"}`}
                small
              />
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Inget har hänt än</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            Aktivitet från familjen dyker upp här.
          </div>
        </div>
      ) : (
        grouped.map(({ label, items: dayItems }) => (
          <div key={label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, padding: "0 4px" }}>
              {label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dayItems.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StatBlock({ label, value, suffix, emoji, small }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.3, marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: small ? 17 : 22,
          fontWeight: 700,
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {emoji && <span style={{ marginRight: 4, fontSize: 16 }}>{emoji}</span>}
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{suffix}</div>
    </div>
  );
}

function ActivityItem({ item }) {
  const time = item.at?.toDate ? item.at.toDate() : null;
  const color = nameColor(item.by?.name || "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: color.soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1px solid ${color.bg}33` }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: color.text }}>{item.by?.name || "Någon"}</span>
          {" "}
          <span style={{ color: "var(--ink-soft)" }}>{item.text}</span>
        </div>
        {time && (
          <div style={{ fontSize: 12, color: "var(--muted-soft)", marginTop: 2 }}>
            {formatTime(time)}
          </div>
        )}
      </div>
    </div>
  );
}

function groupByDay(items) {
  const groups = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const item of items) {
    const date = item.at?.toDate ? item.at.toDate() : new Date();
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    let label;
    if (days === 0) label = "Idag";
    else if (days === 1) label = "Igår";
    else if (days < 7) label = d.toLocaleDateString("sv-SE", { weekday: "long" });
    else label = d.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function formatTime(date) {
  const now = new Date();
  const diff = (now - date) / 60000;
  if (diff < 1) return "nyss";
  if (diff < 60) return `${Math.floor(diff)} min sedan`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} tim sedan`;
  return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}
