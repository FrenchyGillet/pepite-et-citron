/**
 * WCAG 2.x contrast helpers — used by the design-token test that keeps every
 * text colour of GlobalStyle at AA (4.5:1) in both themes.
 */

export interface Rgba { r: number; g: number; b: number; a: number }

/** Parses `#rgb`, `#rrggbb` and `rgb()/rgba()` notations. */
export function parseColor(value: string): Rgba {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const fn = v.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const [r, g, b, a = '1'] = fn[1].split(',').map(s => s.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`Unsupported colour: ${value}`);
}

/** Composites a (possibly translucent) colour over an opaque background. */
export function blend(fg: Rgba, bg: Rgba): Rgba {
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio of `fg` rendered on the opaque `bg` (1 → 21). */
export function contrastRatio(fg: string, bg: string): number {
  const back  = parseColor(bg);
  const front = blend(parseColor(fg), back);
  const [hi, lo] = [relativeLuminance(front), relativeLuminance(back)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
