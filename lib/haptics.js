// lib/haptics.js
// Vibration vid små viktiga händelser. Faller tyst om enheten inte stödjer det.

function vibrate(pattern) {
  if (typeof window === "undefined") return;
  if (!navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch (e) {}
}

export const haptics = {
  light: () => vibrate(8),
  medium: () => vibrate(15),
  success: () => vibrate([10, 40, 20]),
  error: () => vibrate([30, 30, 30]),
};
