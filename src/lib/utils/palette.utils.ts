import type { HarmonyMode, SavedPalette } from '@/types';

import { decodePaletteHash, encodePaletteHash } from '@/lib/engine/palette-share';

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY = 'chroma:palettes';
const LS_PREF_KEY = 'chroma:prefs';

export function loadSaved(): SavedPalette[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
export function savePalette(
  name: string,
  hexes: string[],
  mode: HarmonyMode,
  slotNames?: (string | undefined)[],
): SavedPalette {
  const saved = loadSaved();
  const entry: SavedPalette = {
    id: crypto.randomUUID(),
    name,
    hexes,
    slotNames,
    mode,
    createdAt: Date.now(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify([entry, ...saved].slice(0, 50)));
  return entry;
}
export function deleteSaved(id: string): void {
  localStorage.setItem(LS_KEY, JSON.stringify(loadSaved().filter((p) => p.id !== id)));
}
export function clearSaved(): void {
  localStorage.removeItem(LS_KEY);
}

// Persist user prefs (mode + count)
export function savePrefs(mode: HarmonyMode, count: number): void {
  localStorage.setItem(LS_PREF_KEY, JSON.stringify({ mode, count }));
}

// ─── URL encode/decode ────────────────────────────────────────────────────────

/** Safe check — returns false during SSR where window/location don't exist */
const isBrowser = typeof window !== 'undefined';

export function encodeUrl(hexes: string[], mode: HarmonyMode): string {
  if (!isBrowser) return '';
  const base = `${location.origin}${location.pathname}`;
  return `${base}${encodePaletteHash(hexes, mode)}`;
}

export function decodeUrl(): { hexes: string[]; mode: HarmonyMode } | null {
  if (!isBrowser) return null; // SSR — no location, no hash
  const decoded = decodePaletteHash(location.hash);
  return decoded && { hexes: decoded.hexes, mode: decoded.mode as HarmonyMode };
}
