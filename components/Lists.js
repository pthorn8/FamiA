// components/Lists.js
"use client";

import { useEffect, useState, useMemo } from "react";
import {
  watchLists,
  createList,
  updateList,
  updateListItems,
  addListItem,
  toggleListItem,
  deleteListItem,
  clearCompleted,
  deleteList,
} from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import { nameColor } from "@/lib/colors";
import Sheet from "./Sheet";

const ICONS = ["📋", "🛒", "🏠", "✈️", "🎁", "📚", "🍽️", "🌱", "🔧", "⚽", "🐾", "💊"];

export default function Lists({ familyId, user, family }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showNewList, setShowNewList] = useState(false);

  useEffect(() => {
    const unsub = watchLists(familyId, (l) => { setLists(l); setLoading(false); });
    return () => unsub();
  }, [familyId]);

  if (activeId) {
    const list = lists.find((l) => l.id === activeId);
    if (!list) {
      setActiveId(null);
      return null;
    }
    return <ListDetail familyId={familyId} list={list} family={family} user={user} onBack={() => setActiveId(null)} />;
  }

  return (
    <div>
      <SectionHeader title="Våra listor">
        <button
          onClick={() => setShowNewList(true)}
          style={primaryBtn}
        >
          + Ny lista
        </button>
      </SectionHeader>

      {loading ? (
        <ListSkeleton />
      ) : lists.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="Inga listor än"
          desc="Skapa din första lista för att komma igång."
          actionLabel="Skapa lista"
          onAction={() => setShowNewList(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lists.map((list) => (
            <ListCard key={list.id} list={list} onClick={() => setActiveId(list.id)} />
          ))}
        </div>
      )}

      {showNewList && (
        <NewListSheet
          onClose={() => setShowNewList(false)}
          onCreate={async (name, icon) => {
            await createList(familyId, name, icon, user);
            setShowNewList(false);
          }}
        />
      )}
    </div>
  );
}

function ListCard({ list, onClick }) {
  const total = list.items.length;
  const done = list.items.filter((i) => i.done).length;
  const pct = total ? (done / total) * 100 : 0;
  const upcoming = list.items
    .filter((i) => !i.done && i.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <div
      onClick={onClick}
      data-tappable
      style={{
        background: "var(--surface)",
        borderRadius: 16,
        padding: "18px 20px",
        cursor: "pointer",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{ fontSize: 30 }}>{list.icon || "📋"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {list.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 5, background: "var(--line-soft)", borderRadius: 10, overflow: "hidden", maxWidth: 140 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 && total > 0 ? "var(--sage)" : "var(--coral)", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{done}/{total}</span>
        </div>
        {upcoming && (
          <div style={{ fontSize: 12, color: "var(--coral)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span>📅</span>
            <span>{formatDueDate(upcoming.dueDate)}</span>
          </div>
        )}
      </div>
      <span style={{ color: "#ccc", fontSize: 20 }}>›</span>
    </div>
  );
}

function ListDetail({ familyId, list, family, user, onBack }) {
  const [newItem, setNewItem] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);
  const toast = useToast();

  const sortedItems = useMemo(() => {
    const items = [...list.items];
    const notDone = items.filter((i) => !i.done);
    const done = items.filter((i) => i.done);
    notDone.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    return { notDone, done };
  }, [list.items]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    await addListItem(familyId, list, { text: newItem.trim() }, user);
    setNewItem("");
  };

  const handleSaveName = async () => {
    if (nameValue.trim() && nameValue !== list.name) {
      await updateList(familyId, list.id, { name: nameValue.trim() }, user, `döpte om "${list.name}" till "${nameValue.trim()}"`);
      toast.show("Namn uppdaterat");
    }
    setEditingName(false);
  };

  const handleChangeIcon = async (icon) => {
    await updateList(familyId, list.id, { icon }, user, null);
    setShowMenu(false);
  };

  return (
    <div style={{ animation: "slideIn 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={onBack} style={backBtn}>← Tillbaka</button>
        <button onClick={() => setShowMenu(true)} style={iconBtn}>⋯</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setShowMenu(true)}
          style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 12, width: 56, height: 56, fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {list.icon || "📋"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
              style={{ width: "100%", fontSize: 22, fontFamily: "'DM Serif Display', Georgia, serif", border: "none", borderBottom: "2px solid var(--coral)", outline: "none", padding: "2px 0" }}
            />
          ) : (
            <h2
              className="serif"
              onClick={() => setEditingName(true)}
              style={{ fontSize: 22, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {list.name}
            </h2>
          )}
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {sortedItems.notDone.length} kvar · {sortedItems.done.length} klara
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "var(--surface-soft)", borderRadius: 14, padding: 6 }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Lägg till..."
          style={{ flex: 1, border: "none", background: "transparent", padding: "12px 14px", fontSize: 15, outline: "none" }}
        />
        <button onClick={handleAdd} style={{ background: "var(--coral)", color: "white", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 22, cursor: "pointer", fontWeight: 600 }}>
          +
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sortedItems.notDone.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onToggle={() => toggleListItem(familyId, list, item.id, user)}
            onEdit={() => setEditingItem(item)}
          />
        ))}
        {sortedItems.done.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", padding: "16px 4px 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Klart ({sortedItems.done.length})</span>
            <button
              onClick={async () => {
                await clearCompleted(familyId, list, user);
                toast.show("Rensade klara");
              }}
              style={{ background: "none", border: "none", color: "var(--coral)", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}
            >
              Rensa
            </button>
          </div>
        )}
        {sortedItems.done.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            done
            onToggle={() => toggleListItem(familyId, list, item.id, user)}
            onEdit={() => setEditingItem(item)}
          />
        ))}
        {list.items.length === 0 && (
          <EmptyState emoji="✏️" title="Listan är tom" desc="Lägg till första saken ovan." compact />
        )}
      </div>

      {editingItem && (
        <ItemSheet
          familyId={familyId}
          list={list}
          item={editingItem}
          family={family}
          user={user}
          onClose={() => setEditingItem(null)}
        />
      )}

      {showMenu && (
        <ListMenuSheet
          list={list}
          onChangeIcon={handleChangeIcon}
          onClose={() => setShowMenu(false)}
          onClear={async () => {
            await clearCompleted(familyId, list, user);
            setShowMenu(false);
            toast.show("Rensade klara");
          }}
          onDelete={async () => {
            if (confirm(`Ta bort listan "${list.name}"?`)) {
              await deleteList(familyId, list.id, list.name, user);
              toast.show("Lista borttagen");
              onBack();
            }
          }}
        />
      )}
    </div>
  );
}

function ItemRow({ item, done, onToggle, onEdit }) {
  const overdue = item.dueDate && !done && item.dueDate < todayISO();
  const assigneeC = item.assignedTo ? nameColor(item.assignedTo) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: done ? "var(--surface-soft)" : "var(--surface)",
        borderRadius: 12,
        border: `1px solid ${overdue ? "var(--coral)" : "var(--line)"}`,
        opacity: done ? 0.6 : 1,
        transition: "all 0.15s",
      }}
    >
      <button
        onClick={onToggle}
        aria-label={done ? "Markera ej klar" : "Markera klar"}
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          border: `2px solid ${done ? "var(--sage)" : "var(--muted-soft)"}`,
          background: done ? "var(--sage)" : "transparent",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
          cursor: "pointer",
          padding: 0,
          animation: done ? "checkPop 0.3s ease" : "none",
        }}
      >
        {done ? "✓" : ""}
      </button>
      <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 15, textDecoration: done ? "line-through" : "none", color: done ? "var(--muted)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.text}
        </div>
        {item.notes && !done && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.notes}
          </div>
        )}
        {item.dueDate && !done && (
          <div style={{ display: "flex", gap: 6, marginTop: 4, fontSize: 11, alignItems: "center" }}>
            <span style={{ background: overdue ? "#ffe5e0" : "var(--sage-soft)", color: overdue ? "var(--coral)" : "var(--sage)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
              📅 {formatDueDate(item.dueDate)}
            </span>
          </div>
        )}
      </div>
      {item.assignedTo && !done && (
        <div
          title={`Tilldelad ${item.assignedTo}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: assigneeC.bg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            border: "2px solid var(--surface)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {item.assignedTo[0]?.toUpperCase()}
        </div>
      )}
      <button
        onClick={onEdit}
        style={{ background: "none", border: "none", color: "var(--muted-soft)", cursor: "pointer", fontSize: 18, padding: 4 }}
        aria-label="Redigera"
      >
        ⋯
      </button>
    </div>
  );
}

function ItemSheet({ familyId, list, item, family, user, onClose }) {
  const [text, setText] = useState(item.text);
  const [assignedTo, setAssignedTo] = useState(item.assignedTo || "");
  const [dueDate, setDueDate] = useState(item.dueDate || "");
  const [notes, setNotes] = useState(item.notes || "");
  const toast = useToast();

  const save = async () => {
    const items = list.items.map((i) =>
      i.id === item.id ? { ...i, text: text.trim() || i.text, assignedTo: assignedTo || null, dueDate: dueDate || null, notes: notes.trim() || null } : i
    );
    await updateListItems(familyId, list.id, items);
    toast.show("Sparat");
    onClose();
  };

  const remove = async () => {
    await deleteListItem(familyId, list, item.id, user);
    toast.show("Borttagen");
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>Redigera</h3>

      <label style={fieldLabel}>Vad?</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={sheetInput}
      />

      <label style={fieldLabel}>Anteckning</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Mer info... (frivilligt)"
        rows={2}
        style={{ ...sheetInput, resize: "vertical", minHeight: 60, fontFamily: "inherit" }}
      />

      <label style={fieldLabel}>Tilldela till</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <Chip active={!assignedTo} onClick={() => setAssignedTo("")}>Ingen</Chip>
        {family?.members?.map((m) => {
          const c = nameColor(m.name);
          const isActive = assignedTo === m.name;
          return (
            <button
              key={m.uid}
              onClick={() => setAssignedTo(m.name)}
              style={{
                background: isActive ? c.bg : "var(--surface)",
                color: isActive ? "white" : "var(--ink)",
                border: `1px solid ${isActive ? c.bg : "var(--line)"}`,
                borderRadius: 20,
                padding: "8px 14px 8px 6px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: isActive ? "rgba(255,255,255,0.25)" : c.bg,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {m.name[0]?.toUpperCase()}
              </span>
              {m.name}
            </button>
          );
        })}
      </div>

      <label style={fieldLabel}>Förfaller</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <Chip active={dueDate === todayISO()} onClick={() => setDueDate(todayISO())}>Idag</Chip>
        <Chip active={dueDate === tomorrowISO()} onClick={() => setDueDate(tomorrowISO())}>Imorgon</Chip>
        <Chip active={!dueDate} onClick={() => setDueDate("")}>Ingen</Chip>
      </div>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{ ...sheetInput, marginBottom: 20 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={remove} style={{ flex: 1, background: "var(--surface-soft)", color: "var(--coral)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          🗑️ Ta bort
        </button>
        <button onClick={save} style={{ flex: 2, background: "var(--coral)", color: "white", border: "none", borderRadius: 12, padding: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Spara
        </button>
      </div>
    </Sheet>
  );
}

function ListMenuSheet({ list, onChangeIcon, onClear, onDelete, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 20, marginBottom: 16 }}>Listinställningar</h3>

      <label style={fieldLabel}>Ikon</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {ICONS.map((icon) => (
          <button
            key={icon}
            onClick={() => onChangeIcon(icon)}
            style={{
              width: 46,
              height: 46,
              fontSize: 22,
              border: `2px solid ${list.icon === icon ? "var(--coral)" : "var(--line)"}`,
              background: list.icon === icon ? "var(--coral-soft)" : "white",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            {icon}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={onClear}
          disabled={!list.items.some((i) => i.done)}
          style={{ ...menuItem, opacity: list.items.some((i) => i.done) ? 1 : 0.4 }}
        >
          🧹 Rensa klara
        </button>
        <button onClick={onDelete} style={{ ...menuItem, color: "var(--coral)" }}>
          🗑️ Ta bort listan
        </button>
      </div>
    </Sheet>
  );
}

function NewListSheet({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await onCreate(name.trim(), icon);
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>Ny lista</h3>

      <label style={fieldLabel}>Namn</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="t.ex. Veckans inköp"
        autoFocus
        style={sheetInput}
      />

      <label style={fieldLabel}>Ikon</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {ICONS.map((i) => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            style={{
              width: 46,
              height: 46,
              fontSize: 22,
              border: `2px solid ${icon === i ? "var(--coral)" : "var(--line)"}`,
              background: icon === i ? "var(--coral-soft)" : "white",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            {i}
          </button>
        ))}
      </div>

      <button
        onClick={handleCreate}
        disabled={busy || !name.trim()}
        style={{
          width: "100%",
          background: "var(--coral)",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: 14,
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
          opacity: !name.trim() ? 0.5 : 1,
        }}
      >
        Skapa lista
      </button>
    </Sheet>
  );
}

// === Helpers ===

function SectionHeader({ title, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h2 className="serif" style={{ fontSize: 22 }}>{title}</h2>
      {children}
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--coral)" : "var(--surface)",
        color: active ? "white" : "var(--ink)",
        border: `1px solid ${active ? "var(--coral)" : "var(--line)"}`,
        borderRadius: 20,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ emoji, title, desc, actionLabel, onAction, compact }) {
  return (
    <div style={{ padding: compact ? 24 : 50, textAlign: "center" }}>
      <div style={{ fontSize: compact ? 36 : 52, marginBottom: 12, opacity: 0.5 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280, margin: "0 auto" }}>{desc}</div>
      {actionLabel && (
        <button onClick={onAction} style={{ ...primaryBtn, marginTop: 20 }}>{actionLabel}</button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: 78, borderRadius: 16 }} />
      ))}
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatDueDate(iso) {
  if (!iso) return "";
  const today = todayISO();
  const tomorrow = tomorrowISO();
  if (iso === today) return "Idag";
  if (iso === tomorrow) return "Imorgon";
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

// === Shared styles ===

const primaryBtn = {
  background: "var(--coral)",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const backBtn = {
  background: "none",
  border: "none",
  color: "var(--coral)",
  fontSize: 15,
  cursor: "pointer",
  padding: "4px 0",
  fontWeight: 600,
};

const iconBtn = {
  background: "var(--surface-soft)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  width: 38,
  height: 38,
  fontSize: 20,
  cursor: "pointer",
  color: "var(--ink)",
};

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
  marginBottom: 20,
  background: "var(--surface)",
};

const menuItem = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "14px 16px",
  background: "var(--surface-soft)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--ink)",
};
