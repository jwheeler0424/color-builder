import lcmsWasmUrl from 'lcms-wasm/dist/lcms.wasm' with { type: 'file' };

import type { ColorValue } from '../color.ts';

import { composePalette, type PaletteCompositionConfig } from '../compose.ts';
import {
  buildOptimalSolidFromSlabs,
  loadOptimalSolid,
  optimalGenerators,
  optimalSolid,
  serializeOptimalSolid,
} from '../gamuts/optimal.ts';
import {
  FORMATS,
  HARMONIES,
  OKLAB,
  createCmykConverter,
  fitHex,
  formatColor,
  generateEnginePalette,
  hexToXyz,
  normalizeHex,
  parseColor,
  xyzToLch,
  type ChromaMode,
  type CmykConverter,
  type DisplayGamutId,
  type EngineColor,
  type EnginePaletteConfig,
  type FormatId,
  type FormattableColor,
  type HarmonyId,
  type RenderingIntent,
  type SpaceId,
} from '../index.ts';

export { FORMATS, HARMONIES };
export type { CmykConverter, FormatId, HarmonyId, RenderingIntent, SpaceId } from '../index.ts';

export function createProfileConverter(bytes: Uint8Array, intent: RenderingIntent) {
  return createCmykConverter(bytes, { intent, locateWasm: () => lcmsWasmUrl });
}

export const MAX_SELECTED = 5;
export const MAX_COUNT = 64;
export const DEFAULT_BASES = ['#3b82f6', '#f59e0b', '#e11d48'];
export const DEFAULT_SELECTED: HarmonyId[] = ['analogous', 'complementary', 'triadic'];

export const DEFAULT_COUNTS: Partial<Record<HarmonyId, number>> = {
  complementary: 2,
  'split-comp': 3,
  triadic: 3,
  tetradic: 4,
  square: 4,
  compound: 4,
  'accented-analogous': 4,
  hexadic: 6,
  matsuda_L: 4,
  matsuda_Y: 4,
  matsuda_X: 4,
  matsuda_I: 4,
};

export const SPACES: Array<{ id: SpaceId; label: string; desc: string }> = [
  {
    id: 'oklch',
    label: 'OKLCH',
    desc: 'Most even hue spacing, especially through blues and purples.',
  },
  {
    id: 'cielab',
    label: 'CIELAB',
    desc: 'D50 CIELAB, matching CSS lch() and Adobe/ICC tools. Hue-linear by default: harmony hues are turned on a perceptual hue circle.',
  },
  {
    id: 'cam16',
    label: 'CAM16-UCS',
    desc: "CIE's colour appearance model (CAM16) in its uniform space, under typical web viewing conditions.",
  },
  {
    id: 'hsl',
    label: 'HSL',
    desc: 'Hue turns of the sRGB cube at fixed saturation and lightness. Not perceptual: yellows look lighter than blues.',
  },
  {
    id: 'hsv',
    label: 'HSV',
    desc: 'Hue turns of the sRGB cube at fixed saturation and value. Not perceptual.',
  },
];

export const INTENTS: Array<{ id: RenderingIntent; label: string }> = [
  { id: 'relative', label: 'Relative' },
  { id: 'perceptual', label: 'Perceptual' },
  { id: 'saturation', label: 'Saturation' },
  { id: 'absolute', label: 'Absolute' },
];

export const DISPLAYS: Array<{ id: DisplayGamutId; label: string }> = [
  { id: 'srgb', label: 'sRGB' },
  { id: 'p3', label: 'Display P3' },
  { id: 'rec2020', label: 'Rec.2020' },
];

export interface PaletteSettings {
  spaces: SpaceId[];
  formats: FormatId[];
  display: DisplayGamutId;
  ideal: 'optimal' | 'display';
  chroma: ChromaMode;
  maxLightnessShift: number;
  relativeLightnessShift: number;
  cielabHue: 'linear' | 'native';
  shadeHueShift: boolean;
  naturalChroma: 'ideal' | 'display';
  seed?: number;
}

export const DEFAULT_SETTINGS: PaletteSettings = {
  spaces: ['cam16'],
  formats: ['hex'],
  display: 'srgb',
  ideal: 'optimal',
  chroma: 'match',
  maxLightnessShift: 0.1,
  relativeLightnessShift: 0.14,
  cielabHue: 'linear',
  shadeHueShift: true,
  naturalChroma: 'display',
};

export interface PaletteSwatch {
  hex: string;
  paint: string;
  isBase: boolean;
  displayLimited: boolean;
  idealLimited: boolean;
  values: string[];
  title: string;
}

export interface PaletteRow {
  label: string;
  swatches: PaletteSwatch[];
}

export interface PaletteBlock {
  harmony: (typeof HARMONIES)[number];
  rows: PaletteRow[];
}

export interface PaletteSection {
  input: string;
  hex: string | null;
  blocks: PaletteBlock[];
  error?: string;
}

export interface PaletteRequest {
  bases: string[];
  selected: HarmonyId[];
  counts: Partial<Record<HarmonyId, number>>;
  settings: PaletteSettings;
  converter?: CmykConverter;
}

export interface ComputedPalette extends PaletteRequest {
  sections: PaletteSection[];
  ms: number;
}

interface PaletteBlockJob {
  harmony: (typeof HARMONIES)[number];
  spaces: typeof SPACES;
  configs: EnginePaletteConfig[];
}

type WorkerRequest =
  | { type: 'slabs'; startGenerator: number; endGenerator: number }
  | { type: 'palettes'; configs: EnginePaletteConfig[]; solid?: ArrayBuffer }
  | { type: 'compose'; config: PaletteCompositionConfig; solid?: ArrayBuffer };

type WorkerResponse =
  | { type: 'slabs'; slabs: Float64Array }
  | { type: 'palettes'; palettes: EngineColor[][] }
  | { type: 'compose'; colors: ColorValue[] };

const MAX_WORKERS = 3;
const WORKER_URL = '/palette-worker.js';
const SOLID_DB = 'palette-generator';
const SOLID_STORE = 'engine-cache';
const SOLID_KEY = 'optimal-solid-v1';
let workerSolidData: ArrayBuffer | undefined;
const idleWorkers: Worker[] = [];
const activeWorkers = new Set<Worker>();
const workerWaiters: Array<() => void> = [];
const retiredWorkers = new WeakSet<Worker>();
const workersWithSolid = new WeakSet<Worker>();
let workersUnavailable = false;

export const defaultCount = (id: HarmonyId) => DEFAULT_COUNTS[id] ?? 5;

export function updatePaletteSetting<K extends keyof PaletteSettings>(
  settings: PaletteSettings,
  key: K,
  value: PaletteSettings[K],
): PaletteSettings {
  return { ...settings, [key]: value };
}

export function togglePaletteSpace(settings: PaletteSettings, id: SpaceId): PaletteSettings {
  const has = settings.spaces.includes(id);
  if (has && settings.spaces.length === 1) return settings;
  return {
    ...settings,
    spaces: has ? settings.spaces.filter((space) => space !== id) : [...settings.spaces, id],
  };
}

export function togglePaletteFormat(settings: PaletteSettings, id: FormatId): PaletteSettings {
  const has = settings.formats.includes(id);
  if (has && settings.formats.length === 1) return settings;
  return {
    ...settings,
    formats: FORMATS.map((format) => format.id).filter((format) =>
      format === id ? !has : settings.formats.includes(format),
    ),
  };
}

export function toggleHarmonySelection(selected: HarmonyId[], id: HarmonyId): HarmonyId[] {
  if (selected.includes(id)) return selected.filter((harmony) => harmony !== id);
  return selected.length < MAX_SELECTED ? [...selected, id] : selected;
}

export function updatePaletteCount(
  counts: Partial<Record<HarmonyId, number>>,
  id: HarmonyId,
  value: number,
): Partial<Record<HarmonyId, number>> {
  if (!Number.isFinite(value)) return counts;
  return { ...counts, [id]: Math.min(MAX_COUNT, Math.max(1, Math.round(value))) };
}

export function replaceBaseColor(bases: string[], index: number, value: string): string[] {
  return bases.map((base, current) => (current === index ? value : base));
}

export function removeBaseColor(bases: string[], index: number): string[] {
  return bases.filter((_, current) => current !== index);
}

export function appendBaseColor(bases: string[]): string[] {
  return [...bases, '#10b981'];
}

/** A base color as typed; CMYK needs the loaded profile. */
function readBase(
  input: string,
  cmyk?: CmykConverter,
): { hex: string; base: EnginePaletteConfig['baseColor'] } {
  const { xyz, format } = parseColor(input, { cmyk });
  if (format === 'hex') {
    const hex = normalizeHex(input);
    return { hex, base: hex };
  }
  return { hex: fitHex(OKLAB, xyzToLch(OKLAB, xyz)), base: { xyz } };
}

/** The sRGB hex preview of any supported base color input, or null if it can't be read. */
export function baseColorHex(input: string, cmyk?: CmykConverter): string | null {
  try {
    return readBase(input, cmyk).hex;
  } catch {
    return null;
  }
}

export const isLightColor = (hex: string) => xyzToLch(OKLAB, hexToXyz(hex)).l > 0.65;

function describe(color: FormattableColor, formats: FormatId[], cmyk?: CmykConverter) {
  return {
    values: formats.map((format) => formatColor(color, format, { cmyk })),
    precise: formats.map((format) => formatColor(color, format, { cmyk, precise: true })),
  };
}

function engineSwatch(
  color: EngineColor,
  display: DisplayGamutId,
  formats: FormatId[],
  cmyk?: CmykConverter,
): PaletteSwatch {
  const fmt = (value: number) => value.toFixed(4);
  const { values, precise } = describe(color, formats, cmyk);
  return {
    hex: color.hex,
    paint: display === 'srgb' ? color.hex : color.css.display,
    isBase: color.isBase,
    displayLimited: color.displayLimited,
    idealLimited: color.idealLimited,
    values,
    title: [
      ...precise,
      color.css.display,
      `ideal C ${fmt(color.ideal.c)} → display C ${fmt(color.color.c)}`,
      color.lightnessShift ? `lightness shift ${fmt(color.lightnessShift)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function openSolidDatabase(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined);
    const request = indexedDB.open(SOLID_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SOLID_STORE)) {
        request.result.createObjectStore(SOLID_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(undefined);
  });
}

async function readCachedSolid(): Promise<ArrayBuffer | undefined> {
  const database = await openSolidDatabase();
  if (!database) return undefined;
  return new Promise((resolve) => {
    const request = database.transaction(SOLID_STORE).objectStore(SOLID_STORE).get(SOLID_KEY);
    request.onsuccess = () => {
      database.close();
      resolve(request.result instanceof ArrayBuffer ? request.result : undefined);
    };
    request.onerror = () => {
      database.close();
      resolve(undefined);
    };
  });
}

async function writeCachedSolid(solid: ArrayBuffer): Promise<void> {
  const database = await openSolidDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(SOLID_STORE, 'readwrite');
    transaction.objectStore(SOLID_STORE).put(solid, SOLID_KEY);
    transaction.oncomplete =
      transaction.onerror =
      transaction.onabort =
        () => {
          database.close();
          resolve();
        };
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Palette computation was cancelled.', 'AbortError');
}

function workerCount(): number {
  const available = typeof navigator === 'undefined' ? MAX_WORKERS : navigator.hardwareConcurrency;
  return Math.max(1, Math.min(MAX_WORKERS, available || MAX_WORKERS));
}

/** Workers persist between computations so the solid and module load are paid once. */
async function acquireWorkers(signal: AbortSignal): Promise<Worker[]> {
  while (!workersUnavailable && idleWorkers.length === 0 && activeWorkers.size >= MAX_WORKERS) {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        const index = workerWaiters.indexOf(ready);
        if (index >= 0) workerWaiters.splice(index, 1);
        reject(new DOMException('Palette computation was cancelled.', 'AbortError'));
      };
      const ready = () => {
        signal.removeEventListener('abort', abort);
        resolve();
      };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) return abort();
      workerWaiters.push(ready);
    });
  }
  throwIfAborted(signal);
  const wanted = workerCount();
  const workers = idleWorkers.splice(0, wanted);
  while (
    !workersUnavailable &&
    workers.length < wanted &&
    activeWorkers.size + workers.length < MAX_WORKERS
  ) {
    try {
      workers.push(new Worker(WORKER_URL, { type: 'module' }));
    } catch {
      workersUnavailable = true;
    }
  }
  workers.forEach((worker) => activeWorkers.add(worker));
  return workers;
}

function releaseWorkers(workers: Worker[]): void {
  for (const worker of workers) {
    activeWorkers.delete(worker);
    if (!retiredWorkers.has(worker)) idleWorkers.push(worker);
  }
  workerWaiters.shift()?.();
}

export function disposePaletteWorkers(): void {
  idleWorkers.splice(0).forEach(retireWorker);
  workersUnavailable = false;
}

function retireWorker(worker: Worker): void {
  retiredWorkers.add(worker);
  worker.terminate();
}

function requestWorker(
  worker: Worker,
  request: WorkerRequest,
  signal: AbortSignal,
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      worker.onmessage = null;
      worker.onerror = null;
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      finish();
      retireWorker(worker);
      reject(new DOMException('Palette computation was cancelled.', 'AbortError'));
    };
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      finish();
      resolve(event.data);
    };
    worker.onerror = (event: ErrorEvent) => {
      finish();
      retireWorker(worker);
      reject(new Error(event.message));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return abort();
    try {
      if (request.type !== 'slabs' && request.solid && !workersWithSolid.has(worker)) {
        const solid = request.solid.slice(0);
        worker.postMessage({ ...request, solid }, [solid]);
        workersWithSolid.add(worker);
      } else {
        worker.postMessage(request.type !== 'slabs' ? { ...request, solid: undefined } : request);
      }
    } catch (error) {
      finish();
      reject(error);
    }
  });
}

async function getWorkerSolidData(workers: Worker[], signal: AbortSignal): Promise<ArrayBuffer> {
  const cached = await readCachedSolid();
  throwIfAborted(signal);
  if (cached) {
    try {
      loadOptimalSolid(cached.slice(0));
      workerSolidData = cached;
      return cached;
    } catch {
      // Rebuild stale or damaged cached data.
    }
  }

  try {
    const response = await fetch('/optimal-solid.bin', { signal });
    if (response.ok) {
      const data = await response.arrayBuffer();
      loadOptimalSolid(data.slice(0));
      workerSolidData = data;
      void writeCachedSolid(data.slice(0)).catch(() => undefined);
      return data;
    }
  } catch {
    throwIfAborted(signal);
  }

  const generatorCount = optimalGenerators().length / 3;
  const rangeSize = Math.ceil(generatorCount / workers.length);
  const results = await Promise.allSettled(
    workers.map(async (worker, index) => {
      const startGenerator = index * rangeSize;
      const endGenerator = Math.min(generatorCount, startGenerator + rangeSize);
      const response = await requestWorker(
        worker,
        { type: 'slabs', startGenerator, endGenerator },
        signal,
      );
      if (response.type !== 'slabs')
        throw new Error('Worker returned the wrong solid task result.');
      return response.slabs;
    }),
  );
  throwIfAborted(signal);
  const chunks: Float64Array[] = [];
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    chunks.push(result.value);
  }
  const slabs = new Float64Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    slabs.set(chunk, offset);
    offset += chunk.length;
  }
  buildOptimalSolidFromSlabs(slabs);
  workerSolidData = serializeOptimalSolid();
  void writeCachedSolid(workerSolidData.slice(0)).catch(() => undefined);
  return workerSolidData;
}

interface PreparedSection {
  input: string;
  hex: string | null;
  error?: string;
  jobs: PaletteBlockJob[];
}

async function buildSections(
  request: PaletteRequest,
  signal: AbortSignal,
  workers: Worker[],
): Promise<PaletteSection[]> {
  const { bases, selected, counts, settings, converter } = request;
  const prepared: PreparedSection[] = bases.map((input) => {
    let hex: string;
    let base: EnginePaletteConfig['baseColor'];
    try {
      ({ hex, base } = readBase(input, converter));
    } catch (error) {
      return { input, hex: null, error: (error as Error).message, jobs: [] };
    }
    const jobs = selected.map((id): PaletteBlockJob => {
      const harmony = HARMONIES.find((item) => item.id === id)!;
      const count = counts[id] ?? defaultCount(id);
      const spaces = SPACES.filter((space) => settings.spaces.includes(space.id));
      return {
        harmony,
        spaces,
        configs: spaces.map(({ id: space }): EnginePaletteConfig => ({
          baseColor: base,
          count,
          harmony: id,
          space,
          display: settings.display,
          ideal: settings.ideal,
          chroma: settings.chroma,
          maxLightnessShift: settings.maxLightnessShift,
          relativeLightnessShift: settings.relativeLightnessShift,
          seed: settings.seed,
          cielabHue: settings.cielabHue,
          shadeHueShift: settings.shadeHueShift ? 1 : 0,
          naturalChroma: settings.naturalChroma,
        })),
      };
    });
    return { input, hex, jobs };
  });
  const tasks = prepared
    .map((section, index) => ({ index, configs: section.jobs.flatMap((job) => job.configs) }))
    .filter((task) => task.configs.length > 0);
  const needsOptimal =
    settings.ideal === 'optimal' &&
    tasks.some((task) =>
      task.configs.some((config) => config.space !== 'hsl' && config.space !== 'hsv'),
    );
  const palettes = new Array<EngineColor[][]>(prepared.length);

  let solid: ArrayBuffer | undefined;
  if (needsOptimal && workers.length > 0) {
    try {
      solid = workerSolidData ?? (await getWorkerSolidData(workers, signal));
    } catch (error) {
      if (signal.aborted) throw error;
      workers.forEach(retireWorker);
      workers.length = 0;
      optimalSolid();
      workerSolidData = serializeOptimalSolid();
      void writeCachedSolid(workerSolidData.slice(0)).catch(() => undefined);
      solid = workerSolidData;
    }
  } else if (needsOptimal) {
    optimalSolid();
    workerSolidData = serializeOptimalSolid();
    void writeCachedSolid(workerSolidData.slice(0)).catch(() => undefined);
    solid = workerSolidData;
  }

  if (workers.length > 0) {
    let nextTask = 0;
    await Promise.all(
      workers.map(async (worker) => {
        while (nextTask < tasks.length) {
          throwIfAborted(signal);
          const task = tasks[nextTask++]!;
          if (retiredWorkers.has(worker)) {
            palettes[task.index] = task.configs.map((config) => generateEnginePalette(config));
            continue;
          }
          try {
            const response = await requestWorker(
              worker,
              { type: 'palettes', configs: task.configs, solid },
              signal,
            );
            if (response.type !== 'palettes')
              throw new Error('Worker returned the wrong palette result.');
            palettes[task.index] = response.palettes;
          } catch (error) {
            if (signal.aborted) throw error;
            palettes[task.index] = task.configs.map((config) => generateEnginePalette(config));
          }
        }
      }),
    );
  } else {
    for (const task of tasks) {
      throwIfAborted(signal);
      palettes[task.index] = task.configs.map((config) => generateEnginePalette(config));
    }
  }

  return prepared.map((section, index) => {
    if (section.hex === null) {
      return { input: section.input, hex: null, blocks: [], error: section.error };
    }
    let paletteIndex = 0;
    const blocks = section.jobs.map(({ harmony, spaces }): PaletteBlock => ({
      harmony,
      rows: spaces.map(({ label }) => ({
        label,
        swatches: palettes[index]![paletteIndex++]!.map((color) =>
          engineSwatch(color, settings.display, settings.formats, converter),
        ),
      })),
    }));
    return { input: section.input, hex: section.hex, blocks };
  });
}

export async function computePalette(
  request: PaletteRequest,
  signal: AbortSignal,
): Promise<ComputedPalette> {
  const start = performance.now();
  const workers = await acquireWorkers(signal);
  try {
    const sections = await buildSections(request, signal, workers);
    throwIfAborted(signal);
    return { ...request, sections, ms: performance.now() - start };
  } finally {
    releaseWorkers(workers);
  }
}

export async function computeColorPalette(
  config: PaletteCompositionConfig,
  signal: AbortSignal,
): Promise<ColorValue[]> {
  throwIfAborted(signal);
  const workers = await acquireWorkers(signal);
  try {
    if (!workers.length) return composePalette(config);
    const needsSolid =
      config.ideal !== 'display' && config.space !== 'hsl' && config.space !== 'hsv';
    const solid = needsSolid
      ? (workerSolidData ?? (await getWorkerSolidData(workers, signal)))
      : undefined;
    throwIfAborted(signal);
    const response = await requestWorker(workers[0]!, { type: 'compose', config, solid }, signal);
    if (response.type !== 'compose')
      throw new Error('Worker returned the wrong composition result.');
    return response.colors;
  } finally {
    releaseWorkers(workers);
  }
}
