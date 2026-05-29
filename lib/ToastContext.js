// lib/ToastContext.js
"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          pointerEvents: "none",
          padding: "0 20px",
          width: "100%",
          maxWidth: 480,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: t.type === "error" ? "#3D405B" : "#2D3142",
              color: "white",
              padding: "12px 18px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              animation: "toastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              maxWidth: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{t.type === "error" ? "⚠️" : "✓"}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  return ctx || { show: () => {} };
};
