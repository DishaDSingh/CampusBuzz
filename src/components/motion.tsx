"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts a displayed number up from zero when it first appears —
 * "₹6,08,322", "141", "71%" all work; the prefix/suffix and Indian digit
 * grouping are kept. Text without a number is shown as-is.
 */
export function AnimatedValue({ text, duration = 900 }: { text: string; duration?: number }) {
  const m = text.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : NaN;
  const decimals = m?.[2].includes(".") ? m[2].split(".")[1].length : 0;
  const [shown, setShown] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!m || !Number.isFinite(target) || started.current || reducedMotion()) return;
    started.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setShown(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m, target, duration]);

  if (!m || shown === null) return <>{text}</>;
  const value = shown.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <>
      {m[1]}
      {value}
      {m[3]}
    </>
  );
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** A live "starts in 2d 4h 10m" / "Live now" / "Ended" chip for the next event. */
export function Countdown({ title, startsAt, endsAt, href }: { title: string; startsAt: string; endsAt: string; href: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const live = now !== null && now >= start && now <= end;
  const p = parts(start - (now ?? start));

  return (
    <a
      href={href}
      className="group inline-flex flex-wrap items-center gap-2 rounded-full border border-white/40 bg-white/60 px-3 py-1 text-sm shadow-sm backdrop-blur transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      {live ? (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
        </span>
      ) : (
        <span className="size-2.5 rounded-full bg-[var(--page-accent,var(--primary))]" />
      )}
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground tabular-nums">
        {now === null
          ? ""
          : live
            ? "is live now"
            : now > end
              ? "has ended"
              : `starts in ${p.d ? `${p.d}d ` : ""}${p.h}h ${String(p.m).padStart(2, "0")}m ${p.d ? "" : `${String(p.s).padStart(2, "0")}s`}`}
      </span>
    </a>
  );
}
