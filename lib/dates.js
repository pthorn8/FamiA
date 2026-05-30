// lib/dates.js
// Konsekvent svenskt datum- och tidsformat i hela appen.

export function tsToDate(at) {
  if (!at) return null;
  if (at instanceof Date) return at;
  if (at.toDate) return at.toDate();
  if (at.seconds) return new Date(at.seconds * 1000);
  if (typeof at === "string") return new Date(at);
  return null;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Vänlig relativ tid: "nyss", "5 min sedan", "2 tim sedan", "igår 14:32", "14 mar"
export function relativeTime(at) {
  const d = tsToDate(at);
  if (!d) return "";
  const now = new Date();
  const diffSec = (now - d) / 1000;
  if (diffSec < 30) return "nyss";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min sedan`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const days = Math.round((today - cmp) / 86400000);

  if (days === 0) return `${Math.floor(diffSec / 3600)} tim sedan`;
  if (days === 1) return `igår ${formatTime(d)}`;
  if (days < 7) return `${d.toLocaleDateString("sv-SE", { weekday: "long" })} ${formatTime(d)}`;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

// Vänligt datum: "Idag", "Imorgon", "Igår", "tisdag", "14 mar"
export function friendlyDate(iso) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : tsToDate(iso);
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const days = Math.round((cmp - today) / 86400000);
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  if (days === -1) return "Igår";
  if (days > 0 && days < 7) return d.toLocaleDateString("sv-SE", { weekday: "long" });
  if (days < 0 && days > -7) return d.toLocaleDateString("sv-SE", { weekday: "long" });
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(at) {
  const d = tsToDate(at);
  if (!d) return "";
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

// Hälsning beroende på tid på dygnet
export function timeBasedGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "God natt";
  if (h < 10) return "God morgon";
  if (h < 13) return "God förmiddag";
  if (h < 17) return "Hej";
  if (h < 22) return "God kväll";
  return "God natt";
}
