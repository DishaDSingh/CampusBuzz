/**
 * Print artwork as SVG. The template designer works fully offline; AI-generated
 * SVG goes through `sanitizeSvg` and is only ever displayed via <img> (a data
 * URI), where browsers never run scripts or load external resources.
 */

export const TEMPLATE_STYLES = [
  { key: "varsity", label: "Collegiate" },
  { key: "badge", label: "Crest" },
  { key: "minimal", label: "Wordmark" },
  { key: "stamp", label: "Heritage" },
  { key: "stacked", label: "Athletic" },
] as const;
export type TemplateStyle = (typeof TEMPLATE_STYLES)[number]["key"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Initials for crests: "Horizon Student Association" → "HSA". */
const initials = (t: string) =>
  t
    .split(/\s+/)
    .filter((w) => !/^(of|the|and|&)$/i.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "CB";

/**
 * Professional, print-ready artwork built from type alone — the way real
 * college merch is designed: classic serif and athletic faces, careful
 * letter-spacing, thin rules and stars. System fonts only (Georgia, Impact,
 * Helvetica) so it renders the same everywhere, offline.
 */
export function templateArtwork(opts: { style: TemplateStyle; title: string; subtitle?: string; ink: string; accent?: string }) {
  const raw = opts.title.trim().slice(0, 28) || "CampusBuzz";
  const title = esc(raw.toUpperCase());
  const sub = esc((opts.subtitle ?? "").trim().slice(0, 24).toUpperCase());
  const ink = /^#[0-9a-f]{6}$/i.test(opts.ink) ? opts.ink : "#ffffff";
  const accent = opts.accent && /^#[0-9a-f]{6}$/i.test(opts.accent) ? opts.accent : ink;
  const serif = `font-family="Georgia, 'Times New Roman', serif" font-weight="700"`;
  const athletic = `font-family="Impact, 'Arial Black', Helvetica, sans-serif"`;
  const sans = `font-family="Helvetica, Arial, sans-serif"`;
  // Fit a line of text into `max` px at roughly 0.6em per character.
  const fit = (base: number, len: number, max: number, ratio = 0.62) =>
    Math.max(12, Math.min(base, Math.floor(max / Math.max(1, len) / ratio)));
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
    });
    return `<polygon points="${pts.join(" ")}" fill="${ink}"/>`;
  };
  const year = sub || String(new Date().getFullYear());
  // Wordmark: wide letter-spacing for short names, tighter for long ones, always inside 230px.
  const wordSpacing = title.length > 14 ? 2 : title.length > 9 ? 4 : 7;
  const wordSize = Math.max(12, Math.min(30, Math.floor((230 / Math.max(1, title.length) - wordSpacing) / 0.62)));

  const body = (() => {
    switch (opts.style) {
      // Arched collegiate name over a big year, framed by stars and rules.
      case "varsity":
        return `<defs><path id="arc" d="M45 175 A115 115 0 0 1 255 175"/></defs>
<text ${serif} font-size="${fit(30, title.length, 250, 0.7)}" fill="${ink}" letter-spacing="4" text-anchor="middle"><textPath href="#arc" startOffset="50%">${title}</textPath></text>
${star(78, 196, 7)}${star(222, 196, 7)}
<text ${athletic} x="150" y="232" font-size="64" fill="none" stroke="${accent}" stroke-width="2.5" text-anchor="middle" letter-spacing="2">${esc(year.slice(-4))}</text>
<line x1="70" y1="250" x2="230" y2="250" stroke="${ink}" stroke-width="2"/>
<text ${sans} font-weight="700" x="150" y="270" font-size="11" fill="${ink}" text-anchor="middle" letter-spacing="6">EST. ${esc(year.slice(-4))}</text>`;

      // Shield crest with initials, a ribbon of the full name underneath.
      case "badge":
        return `<path d="M150 40 L232 70 L232 150 Q232 220 150 258 Q68 220 68 150 L68 70 Z" fill="none" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>
<path d="M150 56 L218 80 L218 148 Q218 206 150 240 Q82 206 82 148 L82 80 Z" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
<line x1="96" y1="112" x2="204" y2="112" stroke="${ink}" stroke-width="1.6"/>
${star(150, 92, 9)}
<text ${serif} x="150" y="180" font-size="${initials(raw).length > 2 ? 50 : 62}" fill="${accent}" text-anchor="middle" letter-spacing="2">${initials(raw)}</text>
<path d="M58 238 L242 238 L232 254 L242 270 L58 270 L68 254 Z" fill="${ink}"/>
<text ${sans} font-weight="700" x="150" y="259" font-size="${fit(12, title.length, 160, 0.72)}" fill="${ink === "#ffffff" ? "#111827" : "#ffffff"}" text-anchor="middle" letter-spacing="2">${title}</text>`;

      // Clean modern wordmark with fine rules — the "premium brand" look.
      case "minimal":
        return `<line x1="60" y1="118" x2="240" y2="118" stroke="${ink}" stroke-width="1.2"/>
<text ${sans} font-weight="300" x="150" y="160" font-size="${wordSize}" fill="${ink}" text-anchor="middle" letter-spacing="${wordSpacing}">${title}</text>
<line x1="60" y1="180" x2="240" y2="180" stroke="${ink}" stroke-width="1.2"/>
<text ${sans} font-weight="700" x="150" y="204" font-size="10" fill="${accent}" text-anchor="middle" letter-spacing="8">${sub || "CAMPUS COLLECTION"}</text>`;

      // Heritage label: double border, serif name, small caps details.
      case "stamp":
        return `<rect x="40" y="88" width="220" height="124" rx="4" fill="none" stroke="${ink}" stroke-width="5"/>
<rect x="50" y="98" width="200" height="104" rx="2" fill="none" stroke="${ink}" stroke-width="1.4"/>
<text ${sans} font-weight="700" x="150" y="122" font-size="10" fill="${ink}" text-anchor="middle" letter-spacing="6">AUTHENTIC</text>
<text ${serif} font-style="italic" x="150" y="${title.length > 12 ? 162 : 166}" font-size="${fit(34, title.length, 180, 0.62)}" fill="${accent}" text-anchor="middle">${esc(raw)}</text>
<line x1="90" y1="178" x2="210" y2="178" stroke="${ink}" stroke-width="1"/>
<text ${sans} font-weight="700" x="150" y="194" font-size="10" fill="${ink}" text-anchor="middle" letter-spacing="5">${sub ? `EST. ${sub}` : "SINCE " + year}</text>`;

      // Athletic block lettering with an offset outline shadow.
      case "stacked": {
        const words = title.split(/\s+/).slice(0, 3);
        const lineH = 58;
        const top = 150 - ((words.length - 1) * lineH) / 2 + 20;
        return words
          .map((w, i) => {
            const size = fit(62, w.length, 230, 0.55);
            const y = top + i * lineH;
            return `<text ${athletic} x="154" y="${y + 4}" font-size="${size}" fill="none" stroke="${accent}" stroke-width="2" text-anchor="middle" letter-spacing="1">${w}</text>
<text ${athletic} x="150" y="${y}" font-size="${size}" fill="${ink}" text-anchor="middle" letter-spacing="1">${w}</text>`;
          })
          .join("\n")
          .concat(
            sub
              ? `\n<text ${sans} font-weight="700" x="150" y="${top + words.length * lineH - 18}" font-size="12" fill="${ink}" text-anchor="middle" letter-spacing="8">${sub}</text>`
              : "",
          );
      }
    }
  })();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">${body}</svg>`;
}

/**
 * Defence in depth for model-generated SVG. The real safety boundary is that
 * artwork is rendered only through <img>, but we still strip anything active
 * or external before storing it.
 */
export function sanitizeSvg(input: string): string | null {
  let svg = input.trim();
  const start = svg.indexOf("<svg");
  const end = svg.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  svg = svg.slice(start, end + 6);
  if (svg.length > 60_000) return null;
  svg = svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script[^>]*\/?>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/<(iframe|object|embed|image|use|a|style|animate\w*|set)\b[\s\S]*?(\/>|<\/\1\s*>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none")
    .replace(/javascript:/gi, "");
  if (!/^<svg[\s>]/i.test(svg)) return null;
  if (!/xmlns=/.test(svg)) svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}

/** For <img src>. Works in browsers and on the server. */
export const svgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
