"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes renders an inline <script> that sets light/dark before paint.
 * It only needs to run from the server HTML; when React renders it again in
 * the browser, React 19 logs "Encountered a script tag…". Marking the client
 * copy as JSON keeps it inert and silences that (the script already has
 * suppressHydrationWarning, so the attribute difference is fine).
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);
  return <NextThemesProvider {...props} scriptProps={scriptProps} />;
}
