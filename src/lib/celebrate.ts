/**
 * A tiny confetti burst for big moments (announcement sent, report final…).
 * No library: ~80 coloured pieces animated with CSS, removed afterwards.
 * Skipped entirely for people who prefer reduced motion.
 */
const COLOURS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#a855f7", "#f97316"];

export function celebrate(pieces = 80) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.className = "confetti-layer";
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement("span");
    p.className = "confetti-piece";
    const x = (Math.random() - 0.5) * 2; // −1 … 1 across the screen
    p.style.setProperty("--x", `${x * 45}vw`);
    p.style.setProperty("--y", `${-(40 + Math.random() * 45)}vh`);
    p.style.setProperty("--r", `${(Math.random() - 0.5) * 1080}deg`);
    p.style.setProperty("--d", `${900 + Math.random() * 900}ms`);
    p.style.left = `${50 + x * 8}%`;
    p.style.background = COLOURS[i % COLOURS.length];
    p.style.width = `${6 + Math.random() * 6}px`;
    p.style.height = `${8 + Math.random() * 10}px`;
    p.style.borderRadius = Math.random() > 0.6 ? "50%" : "2px";
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2200);
}
