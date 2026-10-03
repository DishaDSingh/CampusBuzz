import type { ProductTypeKey } from "./rules";
import type { TemplateStyle } from "./artwork";

/**
 * Understands a one-line merch request — "classic navy hoodie for Diwali Gala
 * 2026" — so the studio can set everything up from a prompt. Pure and offline;
 * AI (when configured) only replaces the artwork, never these choices.
 */

const PRODUCTS: [RegExp, ProductTypeKey][] = [
  [/\b(hoodie|hoody|hooded|sweatshirt|jumper)\b/i, "hoodie"],
  [/\b(t-?shirt|tee|shirt|jersey)\b/i, "tshirt"],
  [/\b(cap|hat|baseball)\b/i, "cap"],
  [/\b(tote|bag)\b/i, "tote"],
  [/\b(mug|cup)\b/i, "mug"],
];

/** Garment colours people actually ask for, with print-friendly values. */
export const COLOR_WORDS: Record<string, string> = {
  black: "#111827",
  navy: "#1e3a8a",
  blue: "#1d4ed8",
  maroon: "#7f1d1d",
  burgundy: "#7f1d1d",
  red: "#b91c1c",
  green: "#14532d",
  olive: "#3f4f1f",
  grey: "#6b7280",
  gray: "#6b7280",
  charcoal: "#374151",
  white: "#f5f5f4",
  cream: "#f5efe0",
  beige: "#e7dcc5",
  yellow: "#facc15",
  mustard: "#ca8a04",
  purple: "#7c3aed",
  lavender: "#c4b5fd",
  pink: "#f9a8d4",
  orange: "#ea580c",
  gold: "#d4a017",
  silver: "#c0c4cc",
};

const STYLES: [RegExp, TemplateStyle][] = [
  [/\b(varsity|college|collegiate|classic|university|arch(ed)?)\b/i, "varsity"],
  [/\b(crest|badge|emblem|shield|seal|logo)\b/i, "badge"],
  [/\b(minimal|minimalist|clean|simple|subtle|elegant)\b/i, "minimal"],
  [/\b(retro|vintage|heritage|stamp|old ?school)\b/i, "stamp"],
  [/\b(bold|athletic|sport|sports|big|loud|block)\b/i, "stacked"],
];

const FILLER = new Set(
  "a an the for with and of on in to make create design me our my please some new classic vintage retro minimal minimalist clean simple bold athletic sports sport big loud elegant subtle college collegiate varsity crest badge emblem shield logo style look themed theme print printed front back".split(
    " ",
  ),
);

export type ParsedPrompt = {
  productType: ProductTypeKey | null;
  baseColor: string | null;
  inkColor: string | null;
  style: TemplateStyle | null;
  title: string | null;
  subtitle: string | null;
};

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/** White or near-black ink, whichever reads better on the garment. */
export const inkFor = (base: string) => (luminance(base) > 0.55 ? "#111827" : "#ffffff");

export function parseMerchPrompt(prompt: string): ParsedPrompt {
  const p = prompt.trim();
  const productType = PRODUCTS.find(([re]) => re.test(p))?.[1] ?? null;

  // First colour word is the garment; "with gold text / white print" sets the ink.
  const inkMatch = p.match(/\b(\w+)\s+(?:ink|text|print|lettering|letters|logo)\b/i);
  const ink = inkMatch && COLOR_WORDS[inkMatch[1].toLowerCase()];
  const colours = [...p.toLowerCase().matchAll(/\b([a-z]+)\b/g)].map((m) => m[1]).filter((w) => COLOR_WORDS[w]);
  const garmentWord = colours.find((c) => !inkMatch || c !== inkMatch[1].toLowerCase());
  const baseColor = garmentWord ? COLOR_WORDS[garmentWord] : null;

  const style = STYLES.find(([re]) => re.test(p))?.[1] ?? null;
  const year = p.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;

  // Text: anything in quotes wins; otherwise "for <Name …>" / "saying <…>".
  let title = p.match(/["“'‘](.+?)["”'’]/)?.[1] ?? null;
  if (!title) {
    const m = p.match(/\b(?:for|saying|reads?|says|with the words?)\s+(.+?)(?:\s+(?:in|with|on)\s+|[,.]|$)/i);
    if (m) {
      title = m[1]
        .split(/\s+/)
        .filter((w) => !FILLER.has(w.toLowerCase()) && !COLOR_WORDS[w.toLowerCase()] && !/^(19|20)\d{2}$/.test(w))
        .join(" ")
        .trim();
    }
  }
  if (title)
    title =
      title
        .replace(/\b(19|20)\d{2}\b/g, "")
        .replace(/\s+/g, " ")
        .trim() || null;

  return {
    productType,
    baseColor,
    inkColor: ink || (baseColor ? inkFor(baseColor) : null),
    style,
    title,
    subtitle: year,
  };
}
