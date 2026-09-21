/**
 * Opera AI — 100-palette color engine.
 * 10 families × 10 hues. Every palette derives a full semantic token set (oklch)
 * so buttons, borders, glows and glass panels harmonise automatically.
 */

export type Family = {
  id: string;
  label: string;
  dark: boolean;
  chroma: number; // primary chroma
  bgChroma: number;
  accentShift: number; // hue offset for accent
  primaryL: number;
};

export const FAMILIES: Family[] = [
  { id: "nebula", label: "Nebula", dark: true, chroma: 0.2, bgChroma: 0.04, accentShift: 60, primaryL: 0.72 },
  { id: "cyber", label: "Cyber Neon", dark: true, chroma: 0.27, bgChroma: 0.02, accentShift: 150, primaryL: 0.78 },
  { id: "aurora", label: "Aurora", dark: true, chroma: 0.18, bgChroma: 0.03, accentShift: 100, primaryL: 0.8 },
  { id: "void", label: "Deep Void", dark: true, chroma: 0.14, bgChroma: 0.015, accentShift: 30, primaryL: 0.7 },
  { id: "ember", label: "Ember", dark: true, chroma: 0.22, bgChroma: 0.03, accentShift: -40, primaryL: 0.74 },
  { id: "mono", label: "Monochrome", dark: true, chroma: 0.05, bgChroma: 0.005, accentShift: 180, primaryL: 0.85 },
  { id: "pastel", label: "Pastel Dev", dark: false, chroma: 0.12, bgChroma: 0.02, accentShift: 80, primaryL: 0.6 },
  { id: "paper", label: "Paper Minimal", dark: false, chroma: 0.16, bgChroma: 0.008, accentShift: 40, primaryL: 0.52 },
  { id: "crystal", label: "Crystal", dark: false, chroma: 0.2, bgChroma: 0.03, accentShift: 120, primaryL: 0.58 },
  { id: "sunrise", label: "Sunrise", dark: false, chroma: 0.18, bgChroma: 0.025, accentShift: -60, primaryL: 0.62 },
];

const HUES: { name: string; h: number }[] = [
  { name: "Crimson", h: 20 },
  { name: "Amber", h: 65 },
  { name: "Lime", h: 120 },
  { name: "Emerald", h: 155 },
  { name: "Teal", h: 185 },
  { name: "Cyan", h: 215 },
  { name: "Azure", h: 245 },
  { name: "Indigo", h: 275 },
  { name: "Violet", h: 305 },
  { name: "Magenta", h: 340 },
];

export type Palette = {
  id: string;
  name: string;
  family: Family;
  hue: number;
};

export const PALETTES: Palette[] = FAMILIES.flatMap((family) =>
  HUES.map((hue) => ({
    id: `${family.id}-${hue.name.toLowerCase()}`,
    name: `${family.label} ${hue.name}`,
    family,
    hue: hue.h,
  })),
);

export const DEFAULT_PALETTE_ID = "nebula-azure";

const ok = (l: number, c: number, h: number, a?: number) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${(((h % 360) + 360) % 360).toFixed(1)}${a !== undefined ? ` / ${a}` : ""})`;

export function paletteVars(p: Palette): Record<string, string> {
  const { family: f, hue: h } = p;
  const ah = h + f.accentShift;
  if (f.dark) {
    return {
      "--background": ok(0.13, f.bgChroma, h),
      "--foreground": ok(0.96, 0.01, h),
      "--card": ok(0.18, f.bgChroma + 0.01, h),
      "--card-foreground": ok(0.96, 0.01, h),
      "--popover": ok(0.16, f.bgChroma, h),
      "--popover-foreground": ok(0.96, 0.01, h),
      "--primary": ok(f.primaryL, f.chroma, h),
      "--primary-foreground": ok(0.12, 0.03, h),
      "--secondary": ok(0.24, f.bgChroma + 0.02, h),
      "--secondary-foreground": ok(0.96, 0.01, h),
      "--muted": ok(0.22, f.bgChroma, h),
      "--muted-foreground": ok(0.72, 0.02, h),
      "--accent": ok(f.primaryL + 0.04, f.chroma * 0.9, ah),
      "--accent-foreground": ok(0.12, 0.03, ah),
      "--destructive": ok(0.62, 0.22, 25),
      "--destructive-foreground": ok(0.98, 0.01, 25),
      "--border": ok(0.92, 0.02, h, 0.12),
      "--input": ok(0.92, 0.02, h, 0.16),
      "--ring": ok(f.primaryL, f.chroma, h),
      "--glow": ok(f.primaryL, f.chroma, h),
      "--glow-2": ok(f.primaryL + 0.04, f.chroma * 0.9, ah),
      "--space-deep": ok(0.07, f.bgChroma, h),
      "--glass": ok(0.95, 0.01, h, 0.06),
      "--glass-border": ok(0.95, 0.01, h, 0.14),
    };
  }
  return {
    "--background": ok(0.975, f.bgChroma, h),
    "--foreground": ok(0.2, 0.03, h),
    "--card": ok(0.995, f.bgChroma * 0.5, h),
    "--card-foreground": ok(0.2, 0.03, h),
    "--popover": ok(0.99, f.bgChroma * 0.5, h),
    "--popover-foreground": ok(0.2, 0.03, h),
    "--primary": ok(f.primaryL, f.chroma, h),
    "--primary-foreground": ok(0.99, 0.01, h),
    "--secondary": ok(0.93, f.bgChroma + 0.01, h),
    "--secondary-foreground": ok(0.25, 0.03, h),
    "--muted": ok(0.94, f.bgChroma, h),
    "--muted-foreground": ok(0.48, 0.03, h),
    "--accent": ok(f.primaryL + 0.04, f.chroma * 0.9, ah),
    "--accent-foreground": ok(0.99, 0.01, ah),
    "--destructive": ok(0.58, 0.22, 25),
    "--destructive-foreground": ok(0.98, 0.01, 25),
    "--border": ok(0.2, 0.03, h, 0.12),
    "--input": ok(0.2, 0.03, h, 0.16),
    "--ring": ok(f.primaryL, f.chroma, h),
    "--glow": ok(f.primaryL, f.chroma, h),
    "--glow-2": ok(f.primaryL + 0.04, f.chroma * 0.9, ah),
    "--space-deep": ok(0.9, f.bgChroma + 0.02, h),
    "--glass": ok(1, 0, 0, 0.55),
    "--glass-border": ok(0.2, 0.03, h, 0.1),
  };
}

/** oklch → hex (for WebGL materials that can't parse CSS colors). */
export function oklchToHex(l: number, c: number, h: number): string {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  let r = 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  let g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  let bb = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S;
  const gam = (x: number) => {
    x = Math.max(0, Math.min(1, x));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  r = gam(r); g = gam(g); bb = gam(bb);
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(bb)}`;
}

export function paletteColors(p: Palette) {
  const f = p.family;
  return {
    primary: oklchToHex(f.primaryL, f.chroma, p.hue),
    accent: oklchToHex(f.primaryL + 0.04, f.chroma * 0.9, p.hue + f.accentShift),
    deep: f.dark ? oklchToHex(0.07, f.bgChroma, p.hue) : oklchToHex(0.9, f.bgChroma + 0.02, p.hue),
    dark: f.dark,
  };
}

export function getPalette(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID)!;
}
