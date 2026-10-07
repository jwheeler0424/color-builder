import { Database } from 'bun:sqlite';

import type { Vec3 } from '../math/matrix.ts';

import { colorValue } from '../color.ts';
import { hexToXyz, normalizeHex } from '../output.ts';
import { OKLAB } from '../spaces/oklab.ts';
import colorDatabasePath from './colors.sqlite' with { type: 'file' };

export interface NamedColorMatch {
  name: string;
  hex: string;
  distance: number;
}

export interface NamedColorLookup extends NamedColorMatch {
  queryHex: string;
}

const CACHE_LIMIT = 4096;
const cache = new Map<string, NamedColorMatch>();
const database = new Database(colorDatabasePath, { readonly: true });
const exactLookup = database.query(
  'SELECT name, hex, 0 AS distance FROM color_oklab WHERE hex = ?',
);
const rangeLookup = database.query(
  `SELECT name, hex, l, a, b
   FROM color_oklab
   WHERE id IN (
     SELECT id FROM color_oklab_rtree
     WHERE min_l <= ?1 + ?4 AND max_l >= ?1 - ?4
       AND min_a <= ?2 + ?4 AND max_a >= ?2 - ?4
       AND min_b <= ?3 + ?4 AND max_b >= ?3 - ?4
   )
   ORDER BY (l - ?1) * (l - ?1) + (a - ?2) * (a - ?2) + (b - ?3) * (b - ?3)
   LIMIT 1`,
);

function remember(hex: string, match: NamedColorMatch): NamedColorMatch {
  cache.set(hex, match);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return match;
}

export function findNearestNamedColor(input: string): NamedColorMatch {
  const hex = normalizeHex(input);
  const cached = cache.get(hex);
  if (cached) return cached;

  const exact = exactLookup.get(hex) as NamedColorMatch | null;
  if (exact) return remember(hex, exact);

  return nearestXyz(hexToXyz(hex), hex);
}

export function findNearestNamedColorXyz(input: Vec3): NamedColorMatch {
  const xyz = colorValue(input).xyz;
  const key = `xyz:${xyz.join(',')}`;
  const cached = cache.get(key);
  return cached ?? nearestXyz(xyz, key);
}

function nearestXyz(xyz: Vec3, key: string): NamedColorMatch {
  const { L, a, b } = OKLAB.xyzToLab(xyz);
  let radius = 0.002;
  while (radius <= 2) {
    const candidate = rangeLookup.get(L, a, b, radius) as {
      name: string;
      hex: string;
      l: number;
      a: number;
      b: number;
    } | null;
    if (candidate) {
      const dL = candidate.l - L;
      const da = candidate.a - a;
      const db = candidate.b - b;
      const distance = Math.sqrt(dL * dL + da * da + db * db);
      if (distance <= radius) {
        return remember(key, { name: candidate.name, hex: candidate.hex, distance });
      }
    }
    radius *= 2;
  }

  throw new Error('The named-color spatial index is empty or incomplete.');
}

export function findNearestNamedColors(inputs: readonly string[]): NamedColorLookup[] {
  const batchCache = new Map<string, NamedColorMatch>();
  return inputs.map((input) => {
    const queryHex = normalizeHex(input);
    let match = batchCache.get(queryHex);
    if (!match) {
      match = findNearestNamedColor(queryHex);
      batchCache.set(queryHex, match);
    }
    return { queryHex, ...match };
  });
}
