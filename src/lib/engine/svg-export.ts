import type { PaletteSlot } from './color-stop.ts';

import { renderColor } from './color.ts';
import { contrastRatio, textColor, wcagLevel, BLACK_XYZ, WHITE_XYZ } from './contrast.ts';
import { rgbToHsl } from './device.ts';
import { parseColor } from './parse.ts';

export interface SvgExportOptions {
  swatchW?: number;
  swatchH?: number;
  cols?: number;
  showContrast?: boolean;
  title?: string;
  names?: readonly string[];
}

const esc = (value: string) =>
  value.replace(
    /[&<>\"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!,
  );

export function generateSvgSwatch(
  slots: readonly PaletteSlot[],
  options: SvgExportOptions = {},
): string {
  const {
    swatchW = 180,
    swatchH = 220,
    cols = Math.max(1, Math.min(slots.length, 6)),
    showContrast = true,
    title,
    names = [],
  } = options;
  const rows = Math.ceil(slots.length / cols);
  const headerH = title ? 48 : 16;
  const totalW = cols * swatchW;
  const totalH = rows * swatchH + headerH;

  const swatches = slots
    .map((slot, index) => {
      const color = slot.color.value ?? parseColor(slot.color.hex);
      const rendition = renderColor(color);
      const hsl = rgbToHsl(rendition.srgb);
      const foreground = textColor(color.xyz);
      const tokenName = names[index] ?? slot.name ?? rendition.hex;
      const ratio = Math.max(
        contrastRatio(color.xyz, WHITE_XYZ),
        contrastRatio(color.xyz, BLACK_XYZ),
      );
      const level = wcagLevel(ratio);
      const x = (index % cols) * swatchW;
      const y = Math.floor(index / cols) * swatchH + headerH;
      const lock = slot.locked
        ? `<text x="${x + swatchW - 12}" y="${y + 16}" fill="${esc(foreground)}" opacity=".5" font-size="11">&#128274;</text>`
        : '';
      const badge = showContrast
        ? `<rect x="${x + 8}" y="${y + swatchH - 30}" width="56" height="18" rx="3" fill="${level === 'AAA' || level === 'AA' ? '#00c853' : '#ff1744'}" opacity=".85"/><text x="${x + 36}" y="${y + swatchH - 17}" text-anchor="middle" fill="white" font-size="9" font-family="monospace" font-weight="bold">${ratio.toFixed(1)}:1 ${level}</text>`
        : '';
      return `<g><rect x="${x}" y="${y}" width="${swatchW}" height="${swatchH}" fill="${esc(rendition.hex)}"/>${lock}<text x="${x + 12}" y="${y + swatchH - 60}" fill="${esc(foreground)}" opacity=".6" font-size="9" font-family="system-ui,sans-serif" font-weight="600" text-transform="uppercase" letter-spacing="1">${esc(tokenName)}</text><text x="${x + 12}" y="${y + swatchH - 44}" fill="${esc(foreground)}" font-size="13" font-family="monospace" font-weight="700" letter-spacing="1">${esc(slot.color.hex.toUpperCase())}</text><text x="${x + 12}" y="${y + swatchH - 28}" fill="${esc(foreground)}" opacity=".55" font-size="9" font-family="monospace">H${Math.round(hsl.h)} S${Math.round(hsl.s * 100)} L${Math.round(hsl.l * 100)}</text>${badge}<rect x="${x}" y="${y}" width="${swatchW}" height="${swatchH}" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1"/></g>`;
    })
    .join('\n');
  const heading = title
    ? `<text x="${totalW / 2}" y="32" text-anchor="middle" fill="#1a1a1a" font-size="18" font-family="system-ui,sans-serif" font-weight="700">${esc(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}"><rect width="${totalW}" height="${totalH}" fill="#f5f5f5"/>${heading}${swatches}</svg>`;
}
