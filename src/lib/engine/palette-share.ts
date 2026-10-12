const HEX = /^#[0-9a-fA-F]{6}$/;

/** URL hash form of a palette, e.g. `#p=6366f1-ec4899&m=analogous`. */
export function encodePaletteHash(hexes: readonly string[], mode: string): string {
  return `#p=${hexes.map((hex) => hex.replace('#', '')).join('-')}&m=${mode}`;
}

/** Parses an `encodePaletteHash` hash; needs at least two valid hexes, else `null`. */
export function decodePaletteHash(
  hash: string,
  fallbackMode = 'analogous',
): { hexes: string[]; mode: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const hexes = (params.get('p') || '')
    .split('-')
    .map((hex) => `#${hex}`)
    .filter((hex) => HEX.test(hex));
  return hexes.length >= 2 ? { hexes, mode: params.get('m') || fallbackMode } : null;
}
