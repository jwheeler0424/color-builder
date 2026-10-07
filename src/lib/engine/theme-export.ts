import { colorValue, renderColor } from './color.ts';
import { contrastRatio, textColor, wcagLevel, BLACK_XYZ, WHITE_XYZ } from './contrast.ts';
import { parseColor } from './parse.ts';
import { OKLAB } from './spaces/oklab.ts';
import { xyzToLch } from './spaces/types.ts';
import {
  UTILITY_ROLES,
  deriveThemeTokens,
  semanticSlotNames,
  type ThemeTokenSet,
  type ThemeColorInput,
  type UtilityColorSet,
} from './theme.ts';

const indent = (text: string, by = '  ') =>
  text
    .split('\n')
    .map((line) => by + line)
    .join('\n');

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );

/** CSS custom properties: light on `:root`, dark via `prefers-color-scheme` and a `.dark` class. */
export function buildThemeCss(tokens: ThemeTokenSet): string {
  const semantic = (mode: 'light' | 'dark') =>
    tokens.semantic.map((t) => `  ${t.name}: ${t[mode]};`).join('\n');
  const utility = (mode: 'light' | 'dark') =>
    Object.entries(tokens.utility)
      .map(
        ([role, v]) =>
          `  --${role}: ${v[mode]};\n  --${role}-subtle: ${mode === 'light' ? v.subtle : v.subtleDark};`,
      )
      .join('\n');
  const palette = tokens.palette.map((p) => `  --${p.name}: ${p.hex};`).join('\n');

  return [
    '/* Surfaces: --background < --surface-dim < --card < --card-raised < --popover */',
    ':root {',
    semantic('light'),
    '',
    utility('light'),
    '',
    palette,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    indent(semantic('dark')),
    '',
    indent(utility('dark')),
    '  }',
    '}',
    '',
    '.dark {',
    semantic('dark'),
    '',
    utility('dark'),
    '}',
  ].join('\n');
}

/** Tokens Studio (Figma Tokens) JSON. */
export function buildFigmaTokens(tokens: ThemeTokenSet, utility: UtilityColorSet): string {
  const semantic = (mode: 'light' | 'dark') =>
    Object.fromEntries(
      tokens.semantic.map((t) => [
        t.name.replace(/^--/, ''),
        { value: t[mode], type: 'color', description: t.description },
      ]),
    );
  return JSON.stringify(
    {
      global: Object.fromEntries(
        tokens.palette.map((p) => [p.name, { value: p.hex, type: 'color' }]),
      ),
      semantic: { light: semantic('light'), dark: semantic('dark') },
      utility: Object.fromEntries(
        UTILITY_ROLES.map((role) => {
          const v = tokens.utility[role];
          return [
            role,
            {
              DEFAULT: { value: v.base, type: 'color', description: utility[role].description },
              light: { value: v.light, type: 'color' },
              dark: { value: v.dark, type: 'color' },
              subtle: { value: v.subtle, type: 'color' },
            },
          ];
        }),
      ),
    },
    null,
    2,
  );
}

/** Tailwind v4 `@theme` block; semantic colors point at the CSS variables from `buildThemeCss`. */
export function buildTailwindV4(tokens: ThemeTokenSet): string {
  const semantic = tokens.semantic
    .map((t) => `  --color-${t.name.replace(/^--/, '')}: var(${t.name});`)
    .join('\n');
  const utility = Object.entries(tokens.utility)
    .map(([role, v]) =>
      [
        `  --color-${role}: ${v.base};`,
        `  --color-${role}-light: ${v.light};`,
        `  --color-${role}-dark: ${v.dark};`,
        `  --color-${role}-subtle: ${v.subtle};`,
      ].join('\n'),
    )
    .join('\n');
  const palette = tokens.palette.map((p) => `  --color-${p.name}: ${p.hex};`).join('\n');
  return ['@import "tailwindcss";', '', '@theme {', semantic, '', utility, '', palette, '}'].join(
    '\n',
  );
}

/** Tailwind v3 JavaScript config with CSS-variable-backed semantic and utility colors. */
export function buildTailwindV3(tokens: ThemeTokenSet): string {
  const colors = Object.fromEntries([
    ...tokens.palette.map(({ name, hex }) => [name, hex]),
    ...tokens.semantic.map((token) => [token.name.replace(/^--/, ''), `var(${token.name})`]),
    ...Object.entries(tokens.utility).map(([role, value]) => [
      role,
      {
        DEFAULT: `var(--${role})`,
        light: value.light,
        dark: value.dark,
        subtle: value.subtle,
      },
    ]),
  ]);
  return [
    '/** @type {import("tailwindcss").Config} */',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    `      colors: ${JSON.stringify(colors, null, 6).replaceAll('\n', '\n      ')},`,
    '    },',
    '  },',
    '};',
  ].join('\n');
}

/** W3C design-tokens (Style Dictionary) JSON. */
export function buildStyleDictionary(tokens: ThemeTokenSet, utility: UtilityColorSet): string {
  const semantic = (mode: 'light' | 'dark') =>
    Object.fromEntries(
      tokens.semantic.map((t) => [
        t.name.replace(/^--/, '').replace(/-/g, '_'),
        { $value: t[mode], $type: 'color', $description: t.description },
      ]),
    );
  return JSON.stringify(
    {
      color: {
        primitive: Object.fromEntries(
          tokens.palette.map((p, i) => [
            p.name,
            { $value: p.hex, $type: 'color', $description: `Palette slot ${i + 1}` },
          ]),
        ),
        semantic: { light: semantic('light'), dark: semantic('dark') },
        utility: Object.fromEntries(
          UTILITY_ROLES.map((role) => {
            const v = tokens.utility[role];
            return [
              role,
              {
                base: { $value: v.base, $type: 'color', $description: utility[role].description },
                light: { $value: v.light, $type: 'color' },
                dark: { $value: v.dark, $type: 'color' },
                subtle: { $value: v.subtle, $type: 'color' },
                subtle_dark: { $value: v.subtleDark, $type: 'color' },
              },
            ];
          }),
        ),
      },
    },
    null,
    2,
  );
}

const BADGE: Record<ReturnType<typeof wcagLevel>, string> = {
  AAA: 'aaa',
  AA: 'aa',
  'AA Large': 'aal',
  Fail: 'fail',
};

/** A standalone HTML page presenting the palette, its utility colors and the theme CSS. */
export function buildColorStoryHtml(
  palette: readonly ThemeColorInput[],
  title: string,
  utility: UtilityColorSet,
  names: readonly string[] = semanticSlotNames(palette),
): string {
  const colors = palette.map((input) =>
    typeof input === 'string'
      ? parseColor(input)
      : colorValue(input.xyz, input.alpha, input.display),
  );
  const hexes = colors.map((color) => renderColor(color).hex);
  const swatches = hexes
    .map((hex, i) => {
      const xyz = colors[i]!.xyz;
      const background = renderColor(colors[i]!).css;
      const { l, c, h } = xyzToLch(OKLAB, xyz);
      const level = wcagLevel(
        Math.max(contrastRatio(xyz, WHITE_XYZ), contrastRatio(xyz, BLACK_XYZ)),
      );
      return `
      <div class="swatch">
        <div class="swatch-color" style="background:${background}">
          <span class="swatch-hex" style="color:${textColor(xyz)}">${hex.toUpperCase()}</span>
        </div>
        <div class="swatch-info">
          <strong>${escapeHtml(names[i] ?? `color-${i + 1}`)}</strong>
          <span>L=${Math.round(l * 100)}% C=${c.toFixed(2)} H=${Math.round(h)}°</span>
          <span class="badge badge-${BADGE[level]}">${level}</span>
        </div>
      </div>`;
    })
    .join('');
  const utilities = UTILITY_ROLES.map((role) => {
    const rendered = renderColor(utility[role].value ?? parseColor(utility[role].hex));
    return `
    <div class="util-swatch">
      <div class="util-color" style="background:${rendered.css}"></div>
      <span>${role}</span>
      <code>${rendered.hex}</code>
    </div>`;
  }).join('');
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Color Story — ${safeTitle}</title>
<style>
  :root { font-family: system-ui,sans-serif; }
  body { margin: 0; padding: 40px; background: #fafafa; color: #111; }
  h1 { font-size: 28px; font-weight: 800; letter-spacing: -.03em; margin: 0 0 6px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 40px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #888; margin: 32px 0 12px; }
  .swatches { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 40px; }
  .swatch { border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,.1); width: 140px; }
  .swatch-color { height: 100px; display: flex; align-items: flex-end; padding: 8px; }
  .swatch-hex { font-family: monospace; font-size: 11px; font-weight: 700; }
  .swatch-info { padding: 10px; display: flex; flex-direction: column; gap: 3px; font-size: 11px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-top: 3px; }
  .badge-aaa { background: rgba(34,197,94,.15); color: #16a34a; }
  .badge-aa  { background: rgba(59,130,246,.15); color: #2563eb; }
  .badge-aal { background: rgba(234,179,8,.15);  color: #a16207; }
  .badge-fail{ background: rgba(239,68,68,.13); color: #dc2626; }
  .util-swatches { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 40px; }
  .util-swatch { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; font-size: 11px; }
  .util-color { width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(0,0,0,.1); }
  code { font-size: 10px; color: #666; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; font-size: 11px; overflow-x: auto; line-height: 1.6; }
</style>
</head>
<body>
<h1>Color Story</h1>
<div class="meta">${safeTitle}</div>

<h2>Palette (${hexes.length} colors)</h2>
<div class="swatches">${swatches}</div>

<h2>Utility Colors</h2>
<div class="util-swatches">${utilities}</div>

<h2>CSS Variables</h2>
<pre>${escapeHtml(buildThemeCss(deriveThemeTokens(colors, utility)))}</pre>
</body>
</html>`;
}
