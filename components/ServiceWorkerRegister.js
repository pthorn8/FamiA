// components/ServiceWorkerRegister.js
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("Service worker kunde inte registreras:", err);
        });
      });
    }
  }, []);
  return null;
}
