// components/ActivityFeed.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { watchActivity } from "@/lib/data";
import { nameColor } from "@/lib/colors";
import { tsToDate, relativeTime } from "@/lib/dates";

const GROUP_WINDOW_MS = 10 * 60 * 1000; // 10 min

export default function ActivityFeed({ familyId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchActivity(familyId, (i) => { setItems(i); setLoading(false); }, 80);
    return () => unsub();
  }, [familyId]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  const weekStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const recent = items.filter((i) => {
      const d = tsToDate(i.at);
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
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", gap: 16 }}>
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
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Lugnt just nu</div>
          <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280, margin: "0 auto" }}>
            När någon i familjen lägger till, bockar av eller ändrar något så dyker det upp här.
          </div>
        </div>
      ) : (
        grouped.map(({ label, items: dayItems }) => (
          <div key={label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, padding: "0 4px" }}>
              {label}
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
              {groupConsecutive(dayItems).map((row, i, arr) => (
                <ActivityRow key={row.key || i} row={row} divider={i < arr.length - 1} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Slå ihop på varandra följande händelser från samma person med samma emoji
function groupConsecutive(items) {
  const out = [];
  for (const item of items) {
    const prev = out[out.length - 1];
    const prevDate = prev ? tsToDate(prev.latest.at) : null;
    const itemDate = tsToDate(item.at);
    const closeInTime = prev && prevDate && itemDate && Math.abs(prevDate - itemDate) < GROUP_WINDOW_MS;
    if (
      prev &&
      prev.latest.by?.uid === item.by?.uid &&
      prev.latest.emoji === item.emoji &&
      closeInTime
    ) {
      prev.children.push(item);
    } else {
      out.push({ key: item.id, latest: item, children: [item] });
    }
  }
  return out;
}

function StatBlock({ label, value, suffix, emoji, small }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.3, marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{ fontSize: small ? 17 : 22, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {emoji && <span style={{ marginRight: 4, fontSize: 16 }}>{emoji}</span>}
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{suffix}</div>
    </div>
  );
}

function ActivityRow({ row, divider }) {
  const item = row.latest;
  const count = row.children.length;
  const color = nameColor(item.by?.name || "");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface)", borderBottom: divider ? "1px solid var(--line-soft)" : "none" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: color.soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1px solid ${color.bg}33`, position: "relative" }}>
        {item.emoji}
        {count > 1 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -4,
              background: "var(--coral)",
              color: "white",
              borderRadius: 10,
              padding: "0 5px",
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              textAlign: "center",
              lineHeight: "16px",
              border: "2px solid var(--bg)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: color.text }}>{item.by?.name || "Någon"}</span>{" "}
          <span style={{ color: "var(--ink-soft)" }}>{item.text}</span>
          {count > 1 && (
            <span style={{ color: "var(--muted)" }}> + {count - 1} {count - 1 === 1 ? "till" : "till"}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-soft)", marginTop: 2 }}>{relativeTime(item.at)}</div>
      </div>
    </div>
  );
}

function groupByDay(items) {
  const groups = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const item of items) {
    const date = tsToDate(item.at) || new Date();
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
