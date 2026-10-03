/**
 * Each area of the app has its own colour, used for its sidebar chip, the
 * page's accent bar and glow, and section markers. Class strings are written
 * out in full so Tailwind can see them.
 */
export const TONES = {
  indigo: {
    chip: "bg-linear-to-br from-indigo-400 to-indigo-600 text-white shadow-sm shadow-indigo-900/30 ring-1 ring-white/20",
    accent: "oklch(0.58 0.2 277)",
  },
  violet: {
    chip: "bg-linear-to-br from-violet-400 to-violet-600 text-white shadow-sm shadow-violet-900/30 ring-1 ring-white/20",
    accent: "oklch(0.6 0.22 293)",
  },
  fuchsia: {
    chip: "bg-linear-to-br from-fuchsia-400 to-fuchsia-600 text-white shadow-sm shadow-fuchsia-900/30 ring-1 ring-white/20",
    accent: "oklch(0.62 0.25 322)",
  },
  pink: {
    chip: "bg-linear-to-br from-pink-400 to-pink-600 text-white shadow-sm shadow-pink-900/30 ring-1 ring-white/20",
    accent: "oklch(0.64 0.22 357)",
  },
  rose: {
    chip: "bg-linear-to-br from-rose-400 to-rose-600 text-white shadow-sm shadow-rose-900/30 ring-1 ring-white/20",
    accent: "oklch(0.62 0.22 15)",
  },
  orange: {
    chip: "bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-sm shadow-orange-900/30 ring-1 ring-white/20",
    accent: "oklch(0.68 0.19 45)",
  },
  amber: {
    chip: "bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-900/30 ring-1 ring-white/20",
    accent: "oklch(0.75 0.17 70)",
  },
  lime: {
    chip: "bg-linear-to-br from-lime-400 to-lime-600 text-white shadow-sm shadow-lime-900/30 ring-1 ring-white/20",
    accent: "oklch(0.72 0.19 130)",
  },
  emerald: {
    chip: "bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-900/30 ring-1 ring-white/20",
    accent: "oklch(0.64 0.15 163)",
  },
  teal: {
    chip: "bg-linear-to-br from-teal-400 to-teal-600 text-white shadow-sm shadow-teal-900/30 ring-1 ring-white/20",
    accent: "oklch(0.64 0.12 185)",
  },
  cyan: {
    chip: "bg-linear-to-br from-cyan-400 to-cyan-600 text-white shadow-sm shadow-cyan-900/30 ring-1 ring-white/20",
    accent: "oklch(0.68 0.13 215)",
  },
  sky: {
    chip: "bg-linear-to-br from-sky-400 to-sky-600 text-white shadow-sm shadow-sky-900/30 ring-1 ring-white/20",
    accent: "oklch(0.65 0.15 237)",
  },
  blue: {
    chip: "bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-sm shadow-blue-900/30 ring-1 ring-white/20",
    accent: "oklch(0.6 0.2 260)",
  },
  slate: {
    chip: "bg-linear-to-br from-slate-400 to-slate-600 text-white shadow-sm shadow-slate-900/30 ring-1 ring-white/20",
    accent: "oklch(0.55 0.04 257)",
  },
} as const;

export type Tone = keyof typeof TONES;

/** A cheerful rotation for bar lists. */
export const BAR_TONES = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
] as const;
