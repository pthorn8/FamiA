// lib/ThemeContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // mode: "system" | "light" | "dark"
  const [mode, setMode] = useState("system");
  const [resolved, setResolved] = useState("light");

  // Läs sparad preferens vid start
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme-mode");
      if (saved && ["system", "light", "dark"].includes(saved)) {
        setMode(saved);
      }
    } catch (e) {}
  }, []);

  // Reagera på systemets ljust/mörkt-inställning
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const sys = mq.matches ? "dark" : "light";
      const r = mode === "system" ? sys : mode;
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mode]);

  const setThemeMode = (m) => {
    setMode(m);
    try { localStorage.setItem("theme-mode", m); } catch (e) {}
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode: setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext) || { mode: "system", resolved: "light", setMode: () => {} };
