// components/Chat.js
"use client";

import { useEffect, useState, useRef } from "react";
import { watchMessages, sendMessage, toggleReaction, watchLists, addListItem } from "@/lib/data";
import { nameColor } from "@/lib/colors";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/lib/ToastContext";
import Sheet from "./Sheet";

export default function Chat({ familyId, user, onSeen }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [inputBottom, setInputBottom] = useState("calc(66px + env(safe-area-inset-bottom, 8px))");
  const [lists, setLists] = useState([]);
  const [convertMsg, setConvertMsg] = useState(null);
  const toast = useToast();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const unsub = watchMessages(familyId, (m) => {
      setMessages(m);
      setLoading(false);
    });
    const unsub2 = watchLists(familyId, (l) => setLists(l.filter((x) => x.type !== "note")));
    return () => { unsub(); unsub2(); };
  }, [familyId]);

  useEffect(() => {
    if (messages.length > 0 && onSeen) {
      const last = messages[messages.length - 1];
      onSeen(last.at?.seconds || Date.now() / 1000);
    }
  }, [messages, onSeen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Vilolägets position: precis ovanför tab-baren, inkl. safe area på iPhone
  const REST_BOTTOM = "calc(66px + env(safe-area-inset-bottom, 8px))";

  // Håll skrivfältet ovanför tangentbordet på iOS
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onUpdate = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      // Tangentbordet öppet: lägg rutan strax ovanför det. Stängt: vila ovanför baren.
      setInputBottom(offset > 60 ? `${offset + 8}px` : REST_BOTTOM);
    };
    vv.addEventListener("resize", onUpdate);
    vv.addEventListener("scroll", onUpdate);
    return () => {
      vv.removeEventListener("resize", onUpdate);
      vv.removeEventListener("scroll", onUpdate);
    };
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    setSending(true);
    haptics.light();
    try {
      await sendMessage(familyId, user, trimmed);
    } catch (e) {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "relative", height: "calc(100svh - 82px)", overflow: "hidden" }}>
      {/* Meddelandelistan */}
      <div
        style={{
          height: "100%",
          overflowY: "auto",
          padding: "16px 16px calc(135px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[60, 40, 70, 50].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 38, width: `${w}%`, borderRadius: 14, alignSelf: i % 2 ? "flex-end" : "flex-start" }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Inga meddelanden än</div>
            <div style={{ fontSize: 14 }}>Skriv något till familjen nedan!</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.senderId === user.uid;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const showSender = !isMine && (!prev || prev.senderId !== msg.senderId);
            const isLastInGroup = !next || next.senderId !== msg.senderId;
            const showDayDivider = !prev || !sameDay(prev.at, msg.at);
            return (
              <div key={msg.id}>
                {showDayDivider && <DayDivider at={msg.at} />}
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  showSender={showSender}
                  isLastInGroup={isLastInGroup}
                  familyId={familyId}
                  user={user}
                  onConvert={() => setConvertMsg(msg)}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Skrivfält - fast ovanför tangentbordet */}
      <div
        style={{
          position: "fixed",
          bottom: inputBottom,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          padding: "10px 14px 12px",
          borderTop: "1px solid var(--line)",
          background: "var(--surface)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          zIndex: 200,
        }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Skriv ett meddelande..."
          rows={1}
          style={{
            flex: 1,
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: "10px 16px",
            fontSize: 15,
            outline: "none",
            resize: "none",
            background: "var(--surface-soft)",
            color: "var(--ink)",
            maxHeight: 100,
            lineHeight: 1.4,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="Skicka"
          style={{
            background: text.trim() ? "var(--coral)" : "var(--line)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 42,
            height: 42,
            fontSize: 20,
            cursor: text.trim() ? "pointer" : "default",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          ↑
        </button>
      </div>

      {convertMsg && (
        <ConvertToTaskSheet
          msg={convertMsg}
          lists={lists}
          onClose={() => setConvertMsg(null)}
          onPick={async (list) => {
            await addListItem(familyId, list, { text: convertMsg.text }, user);
            setConvertMsg(null);
            toast.show(`Tillagt i ${list.name}`);
          }}
        />
      )}
    </div>
  );
}

function ConvertToTaskSheet({ msg, lists, onClose, onPick }) {
  return (
    <Sheet onClose={onClose}>
      <h3 className="serif" style={{ fontSize: 20, marginBottom: 6 }}>Lägg till i lista</h3>
      <div style={{ background: "var(--surface-soft)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "var(--ink-soft)", fontStyle: "italic" }}>
        "{msg.text}"
      </div>
      {lists.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14, padding: "8px 0 16px" }}>
          Du har inga checklistor än. Skapa en under Listor först.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(l)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, cursor: "pointer", fontSize: 15, color: "var(--ink)", textAlign: "left" }}
            >
              <span style={{ fontSize: 22 }}>{l.icon || "📋"}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{l.name}</span>
              <span style={{ color: "var(--muted-soft)" }}>›</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function MessageBubble({ msg, isMine, showSender, isLastInGroup, familyId, user, onConvert }) {
  const color = nameColor(msg.senderName || "");
  const [showPicker, setShowPicker] = useState(false);
  const EMOJIS = ["👍", "❤️", "😂", "🎉", "👏", "🙏"];
  const reactions = msg.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  const react = (emoji) => {
    toggleReaction(familyId, msg.id, emoji, user);
    setShowPicker(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: isLastInGroup ? 10 : 2 }}>
      {showSender && (
        <div style={{ fontSize: 11, fontWeight: 600, color: color.text, marginBottom: 3, marginLeft: 12 }}>
          {msg.senderName}
        </div>
      )}
      <div style={{ maxWidth: "78%", position: "relative" }}>
        <div
          onDoubleClick={() => react("❤️")}
          onClick={() => setShowPicker((s) => !s)}
          style={{
            background: isMine ? "var(--coral)" : "var(--surface)",
            color: isMine ? "white" : "var(--ink)",
            border: isMine ? "none" : "1px solid var(--line)",
            borderRadius: 18,
            borderBottomRightRadius: isMine && isLastInGroup ? 5 : 18,
            borderBottomLeftRadius: !isMine && isLastInGroup ? 5 : 18,
            padding: "9px 14px",
            fontSize: 15,
            lineHeight: 1.35,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            cursor: "pointer",
          }}
        >
          {msg.text}
        </div>

        {showPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              [isMine ? "right" : "left"]: 0,
              marginBottom: 6,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 24,
              padding: "6px 8px",
              display: "flex",
              gap: 4,
              boxShadow: "var(--shadow-lg)",
              zIndex: 10,
              animation: "scaleIn 0.12s ease",
            }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={(ev) => { ev.stopPropagation(); react(e); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "2px 4px", borderRadius: 8 }}
              >
                {e}
              </button>
            ))}
            <span style={{ width: 1, background: "var(--line)", margin: "2px 2px" }} />
            <button
              onClick={(ev) => { ev.stopPropagation(); setShowPicker(false); onConvert(); }}
              aria-label="Lägg till i lista"
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "2px 6px", borderRadius: 8 }}
            >
              📋
            </button>
          </div>
        )}
      </div>

      {reactionEntries.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 3, marginLeft: isMine ? 0 : 8, marginRight: isMine ? 8 : 0, flexWrap: "wrap" }}>
          {reactionEntries.map(([emoji, uids]) => {
            const mine = uids.includes(user.uid);
            return (
              <button
                key={emoji}
                onClick={() => toggleReaction(familyId, msg.id, emoji, user)}
                style={{
                  background: mine ? "var(--coral-soft)" : "var(--surface-soft)",
                  border: `1px solid ${mine ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 12,
                  padding: "1px 7px",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: "var(--ink)",
                }}
              >
                <span>{emoji}</span>
                {uids.length > 1 && <span style={{ fontWeight: 600, fontSize: 11 }}>{uids.length}</span>}
              </button>
            );
          })}
        </div>
      )}

      {isLastInGroup && (
        <div style={{ fontSize: 10, color: "var(--muted-soft)", marginTop: 3, marginLeft: isMine ? 0 : 12, marginRight: isMine ? 4 : 0 }}>
          {formatTime(msg.at)}
        </div>
      )}
    </div>
  );
}

function DayDivider({ at }) {
  return (
    <div style={{ textAlign: "center", margin: "12px 0 14px" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", background: "var(--surface-soft)", padding: "4px 12px", borderRadius: 12, border: "1px solid var(--line)" }}>
        {formatDay(at)}
      </span>
    </div>
  );
}

function tsToDate(at) {
  if (!at) return null;
  if (at.toDate) return at.toDate();
  if (at.seconds) return new Date(at.seconds * 1000);
  return null;
}

function sameDay(a, b) {
  const da = tsToDate(a);
  const db = tsToDate(b);
  if (!da || !db) return false;
  return da.toDateString() === db.toDateString();
}

function formatTime(at) {
  const d = tsToDate(at);
  if (!d) return "";
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(at) {
  const d = tsToDate(at);
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const days = Math.round((today - cmp) / 86400000);
  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return d.toLocaleDateString("sv-SE", { weekday: "long" });
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
}
