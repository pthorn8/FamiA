// lib/celebrate.js
// Liten konfetti-effekt som dyker upp när man bockar av sista saken på en lista.

const COLORS = ["#E07A5F", "#81B29A", "#F2CC8F", "#3D405B", "#9B7EBD"];

export function celebrate() {
  if (typeof document === "undefined") return;

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  const COUNT = 40;
  for (let i = 0; i < COUNT; i++) {
    const piece = document.createElement("div");
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = 6 + Math.random() * 6;
    const startX = 50 + (Math.random() - 0.5) * 30; // procent
    const endX = startX + (Math.random() - 0.5) * 60;
    const duration = 1200 + Math.random() * 800;
    const rotate = Math.random() * 720 - 360;
    const delay = Math.random() * 150;

    piece.style.cssText = `
      position: absolute;
      top: 35%;
      left: ${startX}%;
      width: ${size}px;
      height: ${size * 0.6}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
      opacity: 0;
      transform: translateY(0) rotate(0deg);
      animation: confetti-fall ${duration}ms cubic-bezier(0.2, 0.7, 0.4, 1) ${delay}ms forwards;
      --end-x: ${endX - startX}%;
      --rotate: ${rotate}deg;
    `;
    container.appendChild(piece);
  }

  // Lägg in keyframes en gång
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0%   { opacity: 1; transform: translate(0, -20px) rotate(0deg); }
        100% { opacity: 0; transform: translate(var(--end-x), 80vh) rotate(var(--rotate)); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 2500);
}
