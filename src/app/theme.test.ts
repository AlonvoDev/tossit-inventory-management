import { describe, expect, it } from 'vitest';
import { createAppTheme, cssVariables, palettes, type AppearanceMode, type SemanticPalette } from './theme';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

type Pair = [fg: keyof SemanticPalette, bg: keyof SemanticPalette, min: number];
/** Text ≥ 4.5:1; status stripes, focus and input boundaries ≥ 3:1 (WCAG 1.4.3 / 1.4.11). */
const PAIRS: Pair[] = [
  ['text', 'bg', 4.5], ['text', 'surfaceRaised', 4.5], ['textMuted', 'bg', 4.5], ['textMuted', 'surfaceSoft', 4.5],
  ['primary', 'bg', 4.5], ['primaryContrast', 'primary', 4.5], ['primary', 'primaryTint', 4.5],
  ['danger', 'bg', 4.5], ['danger', 'surfaceSoft', 4.5], ['warning', 'bg', 4.5], ['warning', 'surfaceSoft', 4.5], ['info', 'bg', 4.5],
  ['text', 'dangerTint', 4.5], ['text', 'warningTint', 4.5], ['text', 'infoTint', 4.5], ['text', 'successTint', 4.5],
  ['surface', 'danger', 4.5],
  ['focus', 'bg', 3], ['warningStripe', 'bg', 3], ['danger', 'bg', 3], ['control', 'bg', 3], ['control', 'surfaceRaised', 3],
];

describe.each(['light', 'dark'] as AppearanceMode[])('%s palette', mode => {
  const p = palettes[mode];
  it.each(PAIRS)('%s on %s meets %s:1', (fg, bg, min) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(min);
  });

  it('builds an MUI theme of the same mode from the same palette', () => {
    const theme = createAppTheme(mode);
    expect(theme.palette.mode).toBe(mode);
    expect(theme.palette.background.default).toBe(p.bg);
    expect(theme.palette.text.primary).toBe(p.text);
    expect(theme.direction).toBe('rtl');
  });

  it('exposes every semantic colour as a CSS variable', () => {
    const vars = cssVariables(mode);
    expect(Object.keys(vars)).toHaveLength(Object.keys(p).length);
    expect(vars['--tossit-bg']).toBe(p.bg);
  });
});
