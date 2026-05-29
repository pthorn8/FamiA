// lib/colors.js
// Ger varje familjemedlem en egen färg, baserat på namn/uid.
// Samma person → samma färg överallt i appen.

const PALETTE = [
  { bg: "#E07A5F", soft: "#fef4f0", text: "#b8543a", name: "Korall" },
  { bg: "#81B29A", soft: "#eef5f0", text: "#5a8a73", name: "Salvia" },
  { bg: "#F2CC8F", soft: "#fdf6e7", text: "#a8842e", name: "Sand" },
  { bg: "#9B7EBD", soft: "#f4eff8", text: "#6f5594", name: "Lavendel" },
  { bg: "#6B9DC2", soft: "#eef4f9", text: "#3e6c8e", name: "Himmel" },
  { bg: "#D4736E", soft: "#fbedeb", text: "#9a4843", name: "Tegel" },
  { bg: "#7AAE7E", soft: "#eef6ef", text: "#4d7e51", name: "Skog" },
  { bg: "#C28FB8", soft: "#f9eff6", text: "#8a5d81", name: "Rosa" },
];

// Hasha en sträng till ett index i paletten (stabilt - samma input ger alltid samma färg)
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorFor(identifier) {
  if (!identifier) return PALETTE[0];
  return PALETTE[hash(identifier) % PALETTE.length];
}

// Hämta färg för medlem (samma som nameColor om namn finns, fall tillbaka på uid)
export function memberColor(member) {
  return colorFor(member?.name || member?.uid || "");
}

// Hitta färg utifrån bara namn (för t.ex. assignedTo som bara har namn)
export function nameColor(name) {
  return colorFor(name || "");
}

export const PALETTE_FULL = PALETTE;
