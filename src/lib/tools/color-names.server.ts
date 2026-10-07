import { colorValue, parseColor, type ColorValue } from '@/lib/engine/browser';
import {
  findNearestNamedColor,
  findNearestNamedColorXyz,
} from '@/lib/engine/colors/named-color-lookup';

export async function handleColorNames(request: Request): Promise<Response> {
  if (request.method !== 'POST')
    return Response.json({ error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } });
  let colors: Array<string | ColorValue>;
  try {
    const input: unknown = await request.json();
    if (
      !input ||
      typeof input !== 'object' ||
      !('colors' in input) ||
      !Array.isArray(input.colors) ||
      input.colors.length < 1 ||
      input.colors.length > 64
    )
      throw new Error('Provide between 1 and 64 colors.');
    colors = input.colors.map((entry: unknown) => {
      if (typeof entry === 'string') {
        const parsed = parseColor(entry);
        return parsed.format === 'hex' &&
          parsed.alpha === 1 &&
          /^#?[\da-f]{3}$|^#?[\da-f]{6}$/i.test(entry.trim())
          ? entry
          : parsed;
      }
      if (!entry || typeof entry !== 'object' || !('xyz' in entry) || !Array.isArray(entry.xyz))
        throw new Error('Invalid color.');
      const value = entry as ColorValue;
      return colorValue(value.xyz, value.alpha ?? 1, value.display ?? 'srgb');
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid colors.' },
      { status: 400 },
    );
  }
  try {
    const matches = colors.map((color) =>
      typeof color === 'string'
        ? findNearestNamedColor(color)
        : findNearestNamedColorXyz(color.xyz),
    );
    return Response.json({ matches }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Color naming is currently unavailable.' }, { status: 503 });
  }
}
