/**
 * svg-export.ts
 *
 * Generates a labelled SVG swatch sheet from a palette.
 * Used by both the Export modal (download) and the REST API (/api/export/svg).
 */

import type { PaletteSlot } from "@/types";
import { hexToRgb, nearestName, rgbToHsl, textColor } from "@/lib/utils";

export interface SvgExportOptions {
  /** Pixel width of each swatch (default 180) */
  swatchW?: number;
  /** Pixel height of each swatch (default 220) */
  swatchH?: number;
  /** Number of columns (default: auto, min(slots.length, 6)) */
  cols?: number;
  /** Include WCAG badge showing contrast vs white/black (default true) */
  showContrast?: boolean;
  /** Title shown at top of sheet */
  title?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateSvgSwatch(
  slots: PaletteSlot[],
  options: SvgExportOptions = {},
): string {
  const {
    swatchW = 180,
    swatchH = 220,
    cols = Math.min(slots.length, 6),
    showContrast = true,
    title,
  } = options;

  const rows = Math.ceil(slots.length / cols);
  const headerH = title ? 48 : 16;
  const totalW = cols * swatchW;
  const totalH = rows * swatchH + headerH;

  const swatches = slots
    .map((slot, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * swatchW;
      const y = row * swatchH + headerH;

      const rgb = hexToRgb(slot.color.hex);
      const hsl = rgbToHsl(rgb);
      const tc = textColor(rgb);
      const tokenName = slot.name || nearestName(rgb);

      // APCA-lite: simple relative luminance for the contrast badge
      const lum =
        0.2126 * (rgb.r / 255) +
        0.7152 * (rgb.g / 255) +
        0.0722 * (rgb.b / 255);
      const contrastVsWhite = 1.05 / (lum + 0.05);
      const contrastVsBlack = (lum + 0.05) / 0.05;
      const ratio = Math.max(contrastVsWhite, contrastVsBlack).toFixed(1);
      const wcagAA = parseFloat(ratio) >= 4.5;

      const lockIcon = slot.locked
        ? `<text x="${x + swatchW - 12}" y="${y + 16}" fill="${esc(tc)}" opacity=".5" font-size="11">🔒</text>`
        : "";

      const contrastBadge = showContrast
        ? `
      <rect x="${x + 8}" y="${y + swatchH - 30}" width="56" height="18" rx="3"
        fill="${wcagAA ? "#00c853" : "#ff1744"}" opacity=".85"/>
      <text x="${x + 36}" y="${y + swatchH - 17}" text-anchor="middle"
        fill="white" font-size="9" font-family="monospace" font-weight="bold">
        ${ratio}:1 ${wcagAA ? "AA" : "Fail"}
      </text>`
        : "";

      return `
    <g>
      <rect x="${x}" y="${y}" width="${swatchW}" height="${swatchH}" fill="${esc(slot.color.hex)}"/>
      ${lockIcon}
      <text x="${x + 12}" y="${y + swatchH - 60}" fill="${esc(tc)}" opacity=".6"
        font-size="9" font-family="system-ui,sans-serif" font-weight="600"
        text-transform="uppercase" letter-spacing="1">
        ${esc(tokenName)}
      </text>
      <text x="${x + 12}" y="${y + swatchH - 44}" fill="${esc(tc)}"
        font-size="13" font-family="monospace" font-weight="700" letter-spacing="1">
        ${esc(slot.color.hex.toUpperCase())}
      </text>
      <text x="${x + 12}" y="${y + swatchH - 28}" fill="${esc(tc)}" opacity=".55"
        font-size="9" font-family="monospace">
        H${Math.round(hsl.h)} S${Math.round(hsl.s)} L${Math.round(hsl.l)}
      </text>
      ${contrastBadge}
      <rect x="${x}" y="${y}" width="${swatchW}" height="${swatchH}"
        fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1"/>
    </g>`;
    })
    .join("\n");

  const titleEl = title
    ? `<text x="${totalW / 2}" y="32" text-anchor="middle"
        fill="#1a1a1a" font-size="18" font-family="system-ui,sans-serif" font-weight="700">
        ${esc(title)}
      </text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg"
  width="${totalW}" height="${totalH}"
  viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#f5f5f5"/>
  ${titleEl}
  ${swatches}
</svg>`;
}

/** Triggers a browser download of the SVG */
export function downloadSvg(svg: string, filename = "palette.svg"): void {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
