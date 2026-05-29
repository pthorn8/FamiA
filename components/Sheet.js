// components/Sheet.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function Sheet({ children, onClose }) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const drag = useRef({ startY: 0, dy: 0, dragging: false });

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  }, [closing, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  // Dra nedåt för att stänga (känns som en native iOS-dialog)
  const onTouchStart = (e) => {
    const el = sheetRef.current;
    if (el && el.scrollTop > 0) return; // bara när vi är högst upp i innehållet
    drag.current = { startY: e.touches[0].clientY, dy: 0, dragging: true };
  };
  const onTouchMove = (e) => {
    if (!drag.current.dragging) return;
    const dy = e.touches[0].clientY - drag.current.startY;
    if (dy < 0) return;
    drag.current.dy = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    if (!drag.current.dragging) return;
    const { dy } = drag.current;
    drag.current.dragging = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.28s cubic-bezier(0.16,1,0.3,1)";
      if (dy > 110) { close(); }
      else { sheetRef.current.style.transform = "translateY(0)"; }
    }
  };

  return (
    <div className={`backdrop${closing ? " closing" : ""}`} onClick={close}>
      <div
        ref={sheetRef}
        className={`sheet${closing ? " closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}
