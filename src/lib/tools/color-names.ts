import { colorValue, type ColorValue } from '@/lib/engine/color';

const cache = new Map<string, string>();
const pending = new Map<string, ColorValue>();
const inFlight = new Set<string>();
const retryAfter = new Map<string, number>();
const listeners = new Set<() => void>();
let scheduled = false;

export function subscribeColorNames(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function requestColorNames(colors: readonly ColorValue[]): Promise<string[]> {
  const result: string[] = [];
  for (let start = 0; start < colors.length; start += 64) {
    const batch = colors
      .slice(start, start + 64)
      .map((color) => colorValue(color.xyz, color.alpha, color.display));
    const response = await fetch('/api/color-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: batch }),
    });
    if (!response.ok) throw new Error('Color naming is unavailable.');
    const data = (await response.json()) as { matches?: Array<{ name?: unknown }> };
    if (
      !Array.isArray(data.matches) ||
      data.matches.length !== batch.length ||
      data.matches.some((match) => typeof match.name !== 'string' || !match.name.trim())
    )
      throw new Error('Invalid color-name response.');
    const names = data.matches.map((match) => match.name as string);
    batch.forEach((color, index) => {
      cache.set(color.xyz.join(','), names[index]!);
      if (cache.size > 4096) cache.delete(cache.keys().next().value!);
    });
    result.push(...names);
  }
  listeners.forEach((listener) => listener());
  return result;
}

async function flushNames(): Promise<void> {
  scheduled = false;
  const entries = [...pending.entries()];
  pending.clear();
  entries.forEach(([key]) => inFlight.add(key));
  try {
    await requestColorNames(entries.map(([, color]) => color));
  } catch {
    entries.forEach(([key]) => retryAfter.set(key, Date.now() + 30_000));
    while (retryAfter.size > 4096) retryAfter.delete(retryAfter.keys().next().value!);
  } finally {
    entries.forEach(([key]) => inFlight.delete(key));
  }
}

export function lookupColorName(input: ColorValue, fallback: string): string {
  const color = colorValue(input.xyz, input.alpha, input.display);
  const key = color.xyz.join(',');
  const name = cache.get(key);
  if (name) return name;
  if (
    typeof window !== 'undefined' &&
    !inFlight.has(key) &&
    (retryAfter.get(key) ?? 0) <= Date.now()
  ) {
    pending.set(key, color);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        void flushNames();
      });
    }
  }
  return fallback;
}
