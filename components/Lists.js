// components/Lists.js
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  setListRecurrence,
  maybeResetList,
  updateNoteText,
} from "@/lib/data";
import { useToast } from "@/lib/ToastContext";
import { nameColor } from "@/lib/colors";
import { haptics } from "@/lib/haptics";
import { celebrate } from "@/lib/celebrate";
import Sheet from "./Sheet";

const ICONS = ["📋", "🛒", "🏠", "✈️", "🎁", "📚", "🍽️", "🌱", "🔧", "⚽", "🐾", "💊"];

export default function Lists({ familyId, user, family }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showNewList, setShowNewList] = useState(false);
  const [filter, setFilter] = useState("all"); // all | checklist | note

  useEffect(() => {
    const unsub = watchLists(familyId, (l) => {
      setLists(l);
      setLoading(false);
      // Nollställ återkommande listor om en ny period börjat
      l.forEach((list) => {
        if (list.resetSchedule) maybeResetList(familyId, list);
      });
    });
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

  const hasNotes = lists.some((l) => l.type === "note");
  const hasChecklists = lists.some((l) => l.type !== "note");
  const showFilter = hasNotes && hasChecklists;
  const visibleLists = lists.filter((l) => {
    if (filter === "note") return l.type === "note";
    if (filter === "checklist") return l.type !== "note";
    return true;
  });

  return (
    <div>
      <SectionHeader title="Våra listor">
        <button
          onClick={() => setShowNewList(true)}
          style={primaryBtn}
        >
          + Ny
        </button>
      </SectionHeader>

      {showFilter && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[
            { value: "all", label: "Alla" },
            { value: "checklist", label: "Listor" },
            { value: "note", label: "Anteckningar" },
          ].map((opt) => {
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  background: active ? "var(--coral)" : "var(--surface)",
                  color: active ? "white" : "var(--ink)",
                  border: `1px solid ${active ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 20,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : lists.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="Inget än"
          desc="Skapa din första lista eller anteckning för att komma igång."
          actionLabel="Skapa"
          onAction={() => setShowNewList(true)}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleLists.map((list) => (
            <ListCard key={list.id} list={list} onClick={() => setActiveId(list.id)} />
          ))}
        </div>
      )}

      {showNewList && (
        <NewListSheet
          onClose={() => setShowNewList(false)}
          onCreate={async (name, icon, type) => {
            await createList(familyId, name, icon, user, type);
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
        padding: "16px 18px",
        cursor: "pointer",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 15,
      }}
    >
      <span style={{ fontSize: 30 }}>{list.icon || (list.type === "note" ? "📝" : "📋")}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{list.name}</span>
          {list.resetSchedule && <span style={{ fontSize: 12, flexShrink: 0 }} title="Återkommande">🔁</span>}
        </div>
        {list.type === "note" ? (
          <div style={{ fontSize: 13, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {list.text?.trim() ? list.text.trim().split("\n")[0] : "Tom anteckning"}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      <span style={{ color: "var(--muted-soft)", fontSize: 20 }}>›</span>
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

  // Vanliga varor: mest tillagda som inte redan finns i listan
  const frequentSuggestions = (() => {
    const freq = list.frequentItems || {};
    const present = new Set((list.items || []).map((i) => i.text.trim().toLowerCase()));
    return Object.entries(freq)
      .filter(([key, v]) => v.count >= 2 && !present.has(key))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([, v]) => v.text);
  })();

  const quickAddFrequent = async (text) => {
    haptics.light();
    await addListItem(familyId, list, { text }, user);
  };

  const handleToggle = async (item) => {
    const wasUndone = !item.done;
    haptics.light();
    await toggleListItem(familyId, list, item.id, user);
    if (wasUndone) {
      // Kollade vi just av sista kvarvarande?
      const remaining = list.items.filter((i) => !i.done && i.id !== item.id).length;
      const total = list.items.length;
      if (remaining === 0 && total > 1) {
        celebrate();
        haptics.success();
        toast.show(`🎉 Klart! ${list.name} är avbockad.`);
      }
    }
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
        <button onClick={() => setShowMenu(true)} style={iconBtn} aria-label="Listinställningar">⋯</button>
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
            {list.type === "note"
              ? "Anteckning"
              : `${sortedItems.notDone.length} kvar · ${sortedItems.done.length} klara`}
          </span>
        </div>
      </div>

      {list.type === "note" ? (
        <NoteEditor familyId={familyId} list={list} />
      ) : (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, background: "var(--surface-soft)", borderRadius: 14, padding: 6 }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Lägg till..."
            style={{ flex: 1, border: "none", background: "transparent", padding: "12px 14px", fontSize: 15, outline: "none", color: "var(--ink)" }}
          />
          <button onClick={handleAdd} style={{ background: "var(--coral)", color: "white", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 22, cursor: "pointer", fontWeight: 600 }}>
            +
          </button>
        </div>
        {frequentSuggestions.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {frequentSuggestions.map((sugg) => (
              <button
                key={sugg}
                onClick={() => quickAddFrequent(sugg)}
                style={{
                  background: "var(--surface)",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ color: "var(--sage)", fontWeight: 700 }}>+</span> {sugg}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {list.type !== "note" && (
      <div>
        {sortedItems.notDone.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            {sortedItems.notDone.map((item, idx) => (
              <Swipeable
                key={item.id}
                onDelete={async () => {
                  await deleteListItem(familyId, list, item.id, user);
                  toast.show("Borttagen");
                }}
              >
                <ItemRow
                  item={item}
                  onToggle={() => handleToggle(item)}
                  onEdit={() => setEditingItem(item)}
                  divider={idx < sortedItems.notDone.length - 1}
                />
              </Swipeable>
            ))}
          </div>
        )}

        {sortedItems.done.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", padding: "20px 4px 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

        {sortedItems.done.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", opacity: 0.75 }}>
            {sortedItems.done.map((item, idx) => (
              <Swipeable
                key={item.id}
                onDelete={async () => {
                  await deleteListItem(familyId, list, item.id, user);
                  toast.show("Borttagen");
                }}
              >
                <ItemRow
                  item={item}
                  done
                  onToggle={() => handleToggle(item)}
                  onEdit={() => setEditingItem(item)}
                  divider={idx < sortedItems.done.length - 1}
                />
              </Swipeable>
            ))}
          </div>
        )}

        {list.items.length === 0 && (
          <EmptyState emoji="✏️" title="Listan är tom" desc="Lägg till första saken ovan." compact />
        )}
      </div>
      )}

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
          onSetRecurrence={async (schedule) => {
            await setListRecurrence(familyId, list.id, schedule, user);
            toast.show(schedule ? "Listan återkommer nu" : "Återkommande avstängt");
          }}
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

function NoteEditor({ familyId, list }) {
  const [text, setText] = useState(list.text || "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved
  const focused = useRef(false);
  const saveTimer = useRef(null);
  const lastSaved = useRef(list.text || "");

  // Ta emot andras ändringar när man inte själv skriver
  useEffect(() => {
    if (!focused.current && (list.text || "") !== lastSaved.current) {
      setText(list.text || "");
      lastSaved.current = list.text || "";
    }
  }, [list.text]);

  const scheduleSave = (value) => {
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateNoteText(familyId, list.id, value);
      lastSaved.current = value;
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    }, 700);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    scheduleSave(e.target.value);
  };

  const handleBlur = async () => {
    focused.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (text !== lastSaved.current) {
      setStatus("saving");
      await updateNoteText(familyId, list.id, text);
      lastSaved.current = text;
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={handleChange}
        onFocus={() => { focused.current = true; }}
        onBlur={handleBlur}
        placeholder="Skriv här... t.ex. detaljer om vad ni ska handla, mått, länkar, tankar."
        style={{
          width: "100%",
          minHeight: "55vh",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "16px",
          fontSize: 15,
          lineHeight: 1.6,
          outline: "none",
          resize: "none",
          background: "var(--surface)",
          color: "var(--ink)",
          fontFamily: "inherit",
        }}
      />
      <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted-soft)", marginTop: 6, height: 16 }}>
        {status === "saving" ? "Sparar..." : status === "saved" ? "✓ Sparat" : ""}
      </div>
    </div>
  );
}

function ItemRow({ item, done, onToggle, onEdit, divider }) {
  const overdue = item.dueDate && !done && item.dueDate < todayISO();
  const assigneeC = item.assignedTo ? nameColor(item.assignedTo) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 16px",
        background: "var(--surface)",
        borderBottom: divider ? "1px solid var(--line-soft)" : "none",
        transition: "background 0.15s",
      }}
    >
      <button
        onClick={onToggle}
        aria-label={done ? "Markera ej klar" : "Markera klar"}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: `2px solid ${done ? "var(--sage)" : "var(--muted-soft)"}`,
          background: done ? "var(--sage)" : "transparent",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
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
              {overdue ? "Förfaller " : ""}{formatDueDate(item.dueDate)}
            </span>
          </div>
        )}
      </div>
      {item.assignedTo && !done && (
        <div
          title={`Tilldelad ${item.assignedTo}`}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: assigneeC.bg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
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

function ListMenuSheet({ list, onChangeIcon, onClear, onDelete, onClose, onSetRecurrence }) {
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
              background: list.icon === icon ? "var(--coral-soft)" : "var(--surface)",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            {icon}
          </button>
        ))}
      </div>

      {list.type !== "note" && (
        <>
          <label style={fieldLabel}>Återkommande</label>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -4, marginBottom: 8 }}>
            Bockar nollställs automatiskt. Bra för t.ex. veckans sysslor.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {[
              { value: null, label: "Av" },
              { value: "daily", label: "Varje dag" },
              { value: "weekly", label: "Varje vecka" },
              { value: "monthly", label: "Varje månad" },
            ].map((opt) => {
              const active = (list.resetSchedule || null) === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => onSetRecurrence(opt.value)}
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
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.type !== "note" && (
          <button
            onClick={onClear}
            disabled={!list.items.some((i) => i.done)}
            style={{ ...menuItem, opacity: list.items.some((i) => i.done) ? 1 : 0.4 }}
          >
            🧹 Rensa klara
          </button>
        )}
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
  const [type, setType] = useState("checklist");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await onCreate(name.trim(), icon, type);
  };

  const pickType = (t) => {
    setType(t);
    // Byt standardikon om användaren inte valt en egen
    if (t === "note" && icon === "📋") setIcon("📝");
    if (t === "checklist" && icon === "📝") setIcon("📋");
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 22, marginBottom: 20 }}>Ny</h3>

      <label style={fieldLabel}>Typ</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => pickType("checklist")}
          style={{
            flex: 1,
            textAlign: "left",
            padding: "14px",
            borderRadius: 12,
            border: `2px solid ${type === "checklist" ? "var(--coral)" : "var(--line)"}`,
            background: type === "checklist" ? "var(--coral-soft)" : "var(--surface)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>☑️</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Checklista</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Bocka av saker</div>
        </button>
        <button
          onClick={() => pickType("note")}
          style={{
            flex: 1,
            textAlign: "left",
            padding: "14px",
            borderRadius: 12,
            border: `2px solid ${type === "note" ? "var(--coral)" : "var(--line)"}`,
            background: type === "note" ? "var(--coral-soft)" : "var(--surface)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>📝</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Anteckning</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Skriv fritt</div>
        </button>
      </div>

      <label style={fieldLabel}>Namn</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder={type === "note" ? "t.ex. Renovering badrum" : "t.ex. Veckans inköp"}
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
              background: icon === i ? "var(--coral-soft)" : "var(--surface)",
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
        {type === "note" ? "Skapa anteckning" : "Skapa lista"}
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

// === Svep för att ta bort ===
function Swipeable({ children, onDelete }) {
  const [tx, setTx] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const direction = useRef(null); // "h" | "v" | null

  const onStart = (e) => {
    if (removing) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    direction.current = null;
    setSnapping(false);
  };

  const onMove = (e) => {
    if (startX.current == null || removing) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Bestäm riktning vid första rörelsen över ~8px
    if (direction.current == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      direction.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (direction.current !== "h") return;
    // Tillåt bara svep åt vänster
    setTx(Math.min(0, Math.max(dx, -160)));
  };

  const onEnd = () => {
    if (removing) return;
    setSnapping(true);
    if (tx < -90) {
      // Tillräckligt långt svep, ta bort
      setRemoving(true);
      setTx(-window.innerWidth);
      setTimeout(() => {
        onDelete();
      }, 220);
    } else {
      setTx(0);
    }
    startX.current = null;
    startY.current = null;
    direction.current = null;
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Bakgrund (visas när man drar) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--coral)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 22,
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          opacity: Math.min(1, Math.abs(tx) / 60),
          pointerEvents: "none",
        }}
      >
        🗑️ Ta bort
      </div>
      {/* Förgrund (innehållet) */}
      <div
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
        style={{
          transform: `translateX(${tx}px)`,
          transition: snapping ? "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
