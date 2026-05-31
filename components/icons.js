// components/icons.js
// Rena linjeikoner för tab-baren. Använder currentColor så de följer aktiv/inaktiv färg.
"use client";

function Svg({ children, filled }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ active }) {
  return (
    <Svg>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" fill={active ? "var(--coral-soft)" : "none"} />
      <path d="M9.5 21v-6h5v6" />
    </Svg>
  );
}

export function ListIcon({ active }) {
  return (
    <Svg>
      <rect x="3.5" y="4.5" width="17" height="15.5" rx="2.5" fill={active ? "var(--coral-soft)" : "none"} />
      <path d="M7.5 9h2M7.5 13h2M7.5 17h2" />
      <path d="M12.5 9h4.5M12.5 13h4.5M12.5 17h4.5" strokeWidth="1.6" />
    </Svg>
  );
}

export function CalendarIcon({ active }) {
  return (
    <Svg>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" fill={active ? "var(--coral-soft)" : "none"} />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="8.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChatIcon({ active }) {
  return (
    <Svg>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 4v-4H6.5"
        fill={active ? "var(--coral-soft)" : "none"}
      />
      <path d="M8.5 9h7M8.5 12h4" strokeWidth="1.6" />
    </Svg>
  );
}

export function FamilyIcon({ active }) {
  return (
    <Svg>
      <circle cx="9" cy="8" r="3" fill={active ? "var(--coral-soft)" : "none"} />
      <path d="M3.5 20v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v1" fill={active ? "var(--coral-soft)" : "none"} />
      <path d="M16 7.2a3 3 0 0 1 0 5.6" />
      <path d="M18 14.2a5 5 0 0 1 2.5 4.3V20" />
    </Svg>
  );
}

export const TAB_ICONS = [HomeIcon, ListIcon, CalendarIcon, ChatIcon, FamilyIcon];
