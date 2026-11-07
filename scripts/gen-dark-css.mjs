// Generates app/theme-dark.css from app/globals.css.
//
// The design hard-codes ~500 colors. Instead of hand-writing a dark theme, every color is
// re-mapped by the job it does in its declaration (background / text / border / shadow),
// in OKLCH so lightness steps and hue stay consistent:
//   - light backgrounds  -> warm dark surfaces (lighter light-mode surfaces stay "higher")
//   - dark neutral text  -> light text (hierarchy kept: muted stays muted)
//   - colored text       -> lifted to pastel so it stays readable on dark
//   - saturated fills (red buttons, Zalo blue) are kept
// Then each rule that sets both background and text is checked for contrast and fixed.
// Rules are emitted under html[data-theme="dark"], inside the same @media as the original.
//
// Run after editing globals.css:   node scripts/gen-dark-css.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../app/globals.css", import.meta.url);
const OUT = new URL("../app/theme-dark.css", import.meta.url);
const PREFIX = 'html[data-theme="dark"]';

// Dark values for the design tokens. --red stays a fill that carries white text;
// text that used var(--red) is pointed at the lighter --red-text instead.
const DARK_VARS = {
  "--ink": "#f3ebe8", "--muted": "#b4a8a4", "--line": "#3a3134", "--red": "#c8465b", "--red-dark": "#a9354a",
  "--red-text": "#f2909e", "--paper": "#1b1719", "--cream": "#262022",
};
let SURFACE = "#1b1719";
const SKIP_SELECTOR = /\.slip|\.zalo-qr|\.transfer-grid img|nextjs-portal/;

// ---------- color math ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function parseColor(tok) {
  tok = tok.trim().toLowerCase();
  if (tok === "white") return [255, 255, 255, 1];
  if (tok === "black") return [0, 0, 0, 1];
  let m = tok.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = tok.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith("%") ? (parseFloat(x) / 100) * 255 : parseFloat(x)));
    if (p.length < 3) return null;
    return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3] > 1 ? p[3] / 255 : p[3]];
  }
  return null;
}
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklch([r, g, b]) {
  const [R, G, B] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), (Math.atan2(bb, a) * 180) / Math.PI];
}
function oklchToRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((c) => Math.round(clamp(fromLin(clamp(c, 0, 1)), 0, 255)));
}
const hex = ([r, g, b], a = 1) => "#" + [r, g, b, ...(a < 1 ? [Math.round(a * 255)] : [])].map((v) => v.toString(16).padStart(2, "0")).join("");
function luminance([r, g, b]) { return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b); }
function contrast(c1, c2) { const [a, b] = [luminance(c1), luminance(c2)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); }
const WARM_H = 15; // hue of the warm tint used for neutral surfaces/text

// ---------- role mapping ----------
function mapColor(rgba, role) {
  const [r, g, b, a] = rgba;
  let [L, C, H] = rgbToOklch([r, g, b]);
  const neutral = C < 0.035;
  if (neutral) H = WARM_H;
  if (role === "shadow") return hex([0, 0, 0], clamp(a * 1.6, 0, 0.6));
  if (role === "bg") {
    if (C >= 0.1 && L > 0.38 && L < 0.8) return hex(oklchToRgb([clamp(L, 0.48, 0.66), C, H]), a);     // saturated fill: keep
    if (L >= 0.5) {                                                                                      // light surface -> dark
      const L2 = 0.205 + (1 - L) * 0.55;
      const C2 = neutral ? 0.01 : Math.min(C * 1.1, 0.045);
      return hex(oklchToRgb([L2, C2, H]), a);
    }
    return hex(oklchToRgb([Math.min(L + 0.04, 0.32), C, H]), a);                                        // already dark: lift a touch
  }
  if (role === "border") {
    if (C >= 0.1 && L > 0.38) return hex(oklchToRgb([clamp(L, 0.5, 0.72), C, H]), a);
    if (L >= 0.6) return hex(oklchToRgb([clamp(0.205 + (1 - L) * 1.3, 0.28, 0.5), neutral ? 0.012 : Math.min(C, 0.04), H]), a);
    return hex(oklchToRgb([clamp(0.98 - 0.55 * L, 0.6, 0.9), Math.min(C, 0.03), H]), a);
  }
  // text (color, fill, stroke, accent-color, caret-color)
  if (!neutral && C >= 0.06) return hex(oklchToRgb([Math.max(L, 0.76), Math.min(C, 0.13), H]), a);     // colored text -> pastel
  if (L < 0.78) return hex(oklchToRgb([clamp(1.0 - 0.55 * L, 0.56, 0.95), neutral ? 0.008 : Math.min(C, 0.02), H]), a); // dark text -> light, faint warm tint
  return hex([r, g, b], a);                                                                              // light text on fills: keep
}
const roleOf = (prop) =>
  /^(background|background-color|background-image)$/.test(prop) ? "bg"
  : /^(border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|column-rule)$/.test(prop) ? "border"
  : /^(box-shadow|text-shadow|filter)$/.test(prop) ? "shadow"
  : /^(color|fill|stroke|accent-color|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop) ? "text"
  : null;

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(white|black)\b/g;
function mapValue(value, role) {
  let changed = false;
  let out = value.replace(COLOR_RE, (tok) => { const c = parseColor(tok); if (!c) return tok; changed = true; return mapColor(c, role); });
  if (role === "text" && /var\(--red(-dark)?\)/.test(out)) { out = out.replace(/var\(--red(-dark)?\)/g, "var(--red-text)"); changed = true; }
  return changed ? out : null;
}

// ---------- CSS walking ----------
function parseBlocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (depth && j < css.length) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    out.push({ head, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}
function prefixSelector(sel) {
  return sel.split(",").map((s) => {
    s = s.trim();
    if (s === ":root" || s === "html") return PREFIX;
    if (s.startsWith("html")) return PREFIX + s.slice(4);
    return `${PREFIX} ${s}`;
  }).join(",");
}
function resolve(value) {
  const v = value.match(/var\((--[\w-]+)\)/);
  if (v && DARK_VARS[v[1]]) return parseColor(DARK_VARS[v[1]]);
  const m = value.match(COLOR_RE);
  return m ? parseColor(m[0]) : null;
}
function transformRule(head, body) {
  if (SKIP_SELECTOR.test(head)) return "";
  const decls = body.split(";").map((d) => d.trim()).filter(Boolean);
  const out = [];
  let bg = null, fg = null, fgIndex = -1, bgOpaque = true;
  for (const d of decls) {
    const k = d.indexOf(":"); if (k < 0) continue;
    const prop = d.slice(0, k).trim().toLowerCase(), raw = d.slice(k + 1).trim();
    const role = roleOf(prop); if (!role) continue;
    const mapped = mapValue(raw, role);
    const finalValue = mapped ?? raw;
    if (role === "bg" && !/gradient|url\(/.test(finalValue)) { const c = resolve(finalValue); if (c) { bg = c; bgOpaque = (c[3] ?? 1) > 0.85; } }
    if (role === "text") fg = resolve(finalValue);
    // Emit every paint declaration, even unchanged ones (var(--x), none, transparent): the
    // prefix raises specificity, so a state rule like `.chip.selected{background:var(--ink)}`
    // must be re-emitted too or the generated `.chip{…}` would override it.
    out.push(`${prop}:${finalValue}`);
    if (role === "text") fgIndex = out.length - 1;
  }
  // contrast repair when a rule paints both its background and its text
  if (bg && fg && bgOpaque && contrast(bg, fg) < 3.2) {
    const light = parseColor(DARK_VARS["--ink"]), dark = parseColor(SURFACE);
    const better = contrast(bg, light) >= contrast(bg, dark) ? DARK_VARS["--ink"] : SURFACE;
    const decl = `color:${better}`;
    if (fgIndex >= 0) out[fgIndex] = decl; else out.push(decl);
  }
  return out.length ? `${prefixSelector(head)}{${out.join(";")}}` : "";
}
function walk(css) {
  let result = "";
  for (const { head, body } of parseBlocks(css)) {
    if (head.startsWith("@media")) { if (/print/.test(head)) continue; const inner = walk(body); if (inner) result += `${head}{${inner}}\n`; }
    else if (head.startsWith("@")) continue; // keyframes, font-face, supports…
    else { const r = transformRule(head, body); if (r) result += r + "\n"; }
  }
  return result;
}

const css = readFileSync(SRC, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import[^;]+;/g, "");
// Neutral tokens come from the same mapping as everything else, so surfaces match exactly.
const rootVars = Object.fromEntries([...(css.match(/:root\{([^}]*)\}/)?.[1] ?? "").matchAll(/(--[\w-]+):([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
const derive = (name, role) => { const c = parseColor(rootVars[name] ?? ""); if (c) DARK_VARS[name] = mapColor(c, role); };
derive("--paper", "bg"); derive("--cream", "bg"); derive("--line", "border"); derive("--ink", "text"); derive("--muted", "text");
SURFACE = DARK_VARS["--paper"];
const vars = Object.entries(DARK_VARS).map(([k, v]) => `${k}:${v}`).join(";");
const header = `/* GENERATED by scripts/gen-dark-css.mjs from globals.css — do not edit by hand. */
${PREFIX}{${vars};color-scheme:dark}
${PREFIX} body{background:var(--paper);color:var(--ink)}
`;
const generated = walk(css);
// Hand-tuned touches the mapping can't infer.
const extra = `
${PREFIX} img:not(.zalo-qr):not(.transfer-grid img):not(.review-photo){filter:brightness(.92) contrast(1.03)}
${PREFIX} .product-image,${PREFIX} .product-photo-frame{background-color:#2a2326}
${PREFIX} ::selection{background:#6b2a36;color:#fff}
${PREFIX} input::placeholder,${PREFIX} textarea::placeholder{color:#8f8481}
${PREFIX} .modal::backdrop{background:#0b090ad9}
${PREFIX} .zalo-qr{background:#fff}
`;
writeFileSync(OUT, header + generated + extra);
console.log(`theme-dark.css: ${generated.split("\n").filter(Boolean).length} rules`);
