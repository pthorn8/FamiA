// components/Chat.js
"use client";

import { useEffect, useState, useRef } from "react";
import { watchMessages, sendMessage } from "@/lib/data";
import { nameColor } from "@/lib/colors";

export default function Chat({ familyId, user, onSeen }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [inputBottom, setInputBottom] = useState(70);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const unsub = watchMessages(familyId, (m) => {
      setMessages(m);
      setLoading(false);
    });
    return () => unsub();
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

  // Håll skrivfältet ovanför tangentbordet på iOS
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onUpdate = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setInputBottom(Math.max(70, offset + 8));
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
          padding: "16px 16px 120px",
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
    </div>
  );
}

function MessageBubble({ msg, isMine, showSender, isLastInGroup }) {
  const color = nameColor(msg.senderName || "");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: isLastInGroup ? 10 : 2 }}>
      {showSender && (
        <div style={{ fontSize: 11, fontWeight: 600, color: color.text, marginBottom: 3, marginLeft: 12 }}>
          {msg.senderName}
        </div>
      )}
      <div style={{ maxWidth: "78%" }}>
        <div
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
          }}
        >
          {msg.text}
        </div>
      </div>
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
