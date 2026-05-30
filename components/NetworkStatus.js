// components/NetworkStatus.js
"use client";

import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 2000);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !justReconnected) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: online ? "var(--sage)" : "var(--ink-soft)",
        color: "white",
        padding: "max(env(safe-area-inset-top, 6px), 6px) 16px 8px",
        fontSize: 12,
        fontWeight: 600,
        textAlign: "center",
        zIndex: 300,
        letterSpacing: 0.3,
        animation: "slideIn 0.25s ease",
      }}
    >
      {online ? "✓ Ansluten igen" : "Offline – ändringar synkar när du är ansluten igen"}
    </div>
  );
}
