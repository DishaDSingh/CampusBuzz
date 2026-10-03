import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 via-pink-500 to-violet-600 text-white shadow-md shadow-pink-500/30">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
          <path d="M5 12h3l2-5 4 10 2-5h3" />
        </svg>
      </span>
      CampusBuzz
    </Link>
  );
}
