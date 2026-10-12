import type { ThemeTokenSet } from '@/lib/engine/theme';
import type { PaletteSlot, ThemePaletteVariant } from '@/types';

import { renderColor, stopToColor, themeColorFingerprint } from '@/lib/engine/browser';

function colorTokenValue(stop: NonNullable<ThemePaletteVariant['light']>) {
  const color = stopToColor(stop);
  const rendition = renderColor(color);
  return color.display === 'srgb' && color.alpha === 1 ? rendition.hex : rendition.css;
}

export function applyThemePaletteVariants(
  tokens: ThemeTokenSet,
  slots: readonly PaletteSlot[],
  variants: Readonly<Record<string, ThemePaletteVariant>>,
): ThemeTokenSet {
  return {
    ...tokens,
    palette: tokens.palette.map((token, index) => {
      const slot = slots[index];
      if (!slot) return token;
      const variant = variants[slot.id];
      if (variant?.sourceFingerprint !== themeColorFingerprint(stopToColor(slot.color)))
        return token;

      return {
        ...token,
        ...(variant.light ? { light: colorTokenValue(variant.light) } : {}),
        ...(variant.dark ? { dark: colorTokenValue(variant.dark) } : {}),
      };
    }),
  };
}
