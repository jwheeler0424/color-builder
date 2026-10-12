import { closeSync, openSync, unlinkSync, writeFileSync } from 'node:fs';

export interface ReviewColor {
  hex: string;
  currentName: string;
  source: string;
  family: string;
  tone: string;
  oklch: string;
}

export interface ReviewName {
  hex: string;
  name: string;
}

export interface WorkerRow {
  id: number;
  name: string;
  hex?: unknown;
}

const QUEUE_HEADER = ['hex', 'current name', 'source', 'family', 'tone', 'oklch'];
const HEX = /^#[\da-f]{6}$/i;
const GENERIC_WORDS = new Set([
  'pure',
  'bright',
  'light',
  'dark',
  'soft',
  'pale',
  'deep',
  'rich',
  'vivid',
  'crimson',
  'red',
  'pink',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'color',
  'shade',
]);

function normalizeName(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function validateName(name: string): string | null {
  if (!name || name.trim() !== name || name !== name.normalize('NFKC')) return 'Invalid name';
  if (/\d|#[\da-f]{3,8}/i.test(name)) return 'Code';
  const words = name.split(/\s+/);
  if (words.length > 3) {
    if (words.every((word) => GENERIC_WORDS.has(word.toLocaleLowerCase('en-US')))) return 'Generic';
    return 'Invalid name';
  }
  if (words.length < 2) return 'Invalid name';
  if (words.every((word) => GENERIC_WORDS.has(word.toLocaleLowerCase('en-US')))) return 'Generic';
  return null;
}

export function parseQueue(input: string): ReviewColor[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines
    .shift()
    ?.split('|')
    .map((part) => part.trim().toLocaleLowerCase('en-US'));
  if (
    !header ||
    header.length !== QUEUE_HEADER.length ||
    header.some((value, index) => value !== QUEUE_HEADER[index])
  )
    throw new Error('Invalid review queue header.');
  const queue = lines.map((line) => {
    const cells = line.split('|').map((part) => part.trim());
    if (cells.length !== QUEUE_HEADER.length || !HEX.test(cells[0]!))
      throw new Error('Invalid review queue row.');
    return {
      hex: cells[0]!.toUpperCase(),
      currentName: cells[1]!,
      source: cells[2]!,
      family: cells[3]!,
      tone: cells[4]!,
      oklch: cells[5]!,
    };
  });
  const seen = new Set<string>();
  for (const color of queue) {
    if (seen.has(color.hex)) throw new Error(`Queue repeats ${color.hex}.`);
    seen.add(color.hex);
  }
  return queue;
}

export function partitionPending<T extends { hex: string }>(
  colors: readonly T[],
  firstBatch: number,
) {
  const batchSize = 300;
  if (colors.length % batchSize !== 0)
    throw new Error('Pending colors must fill complete batches.');
  const seen = new Set<string>();
  for (const color of colors) {
    const hex = color.hex.toUpperCase();
    if (seen.has(hex)) throw new Error(`Pending queue repeats ${hex}.`);
    seen.add(hex);
  }
  return Array.from({ length: colors.length / batchSize }, (_, index) => ({
    batch: firstBatch + index,
    queue: colors.slice(index * batchSize, (index + 1) * batchSize),
  }));
}

export function publishJson(path: string, value: unknown): void {
  const fd = openSync(path, 'wx');
  try {
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } catch (error) {
    closeSync(fd);
    try {
      unlinkSync(path);
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
  closeSync(fd);
}

export function parseWorkerOutput(output: string): ReviewName[] {
  let content: string | undefined;
  let successful = false;
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const event = JSON.parse(line) as {
      type?: string;
      exitCode?: number;
      data?: { content?: unknown; toolRequests?: unknown[] };
    };
    if (event.type === 'assistant.message') {
      if ((event.data?.toolRequests?.length ?? 0) > 0) throw new Error('Worker requested tools.');
      if (typeof event.data?.content === 'string') content = event.data.content;
    }
    if (event.type === 'result') successful = event.exitCode === 0;
  }
  if (!successful || !content) throw new Error('Worker did not complete successfully.');
  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error('Worker result must be an array.');
  return parsed as ReviewName[];
}

export function mapWorkerRows(
  rows: readonly WorkerRow[],
  queue: readonly ReviewColor[],
): ReviewName[] {
  if (rows.length !== queue.length) throw new Error('Worker rows must cover the complete queue.');
  const mapped = new Array<ReviewName>(queue.length);
  const seen = new Set<number>();
  for (const row of rows) {
    if ('hex' in row) throw new Error('Worker rows may contain only a name row and id.');
    if (!Number.isInteger(row.id) || row.id < 1 || row.id > queue.length || seen.has(row.id))
      throw new Error('Worker IDs must be distinct and in-range.');
    if (typeof row.name !== 'string' || !row.name.trim())
      throw new Error('Worker name is invalid.');
    seen.add(row.id);
    mapped[row.id - 1] = { hex: queue[row.id - 1]!.hex, name: row.name };
  }
  return mapped;
}

export function validateCandidate<T extends { hex: string; currentName: string; source?: string }>(
  entries: readonly ReviewName[],
  queue: readonly T[],
): ReviewName[] {
  if (entries.length !== queue.length) throw new Error('Candidate must cover the queue exactly.');
  const queueByHex = new Map(queue.map((color) => [color.hex.toUpperCase(), color]));
  const entriesByHex = new Map<string, ReviewName>();
  const names = new Set<string>();
  const prefixes = new Map<string, number>();
  for (const entry of entries) {
    const hex = entry.hex.toUpperCase();
    if (!queueByHex.has(hex)) throw new Error(`Unqueued color ${entry.hex}.`);
    if (entriesByHex.has(hex)) throw new Error(`Candidate has repeated hex ${hex}.`);
    const color = queueByHex.get(hex)!;
    if (
      normalizeName(entry.name) === normalizeName(color.currentName) &&
      color.source !== 'named-colors'
    )
      throw new Error(`Unreviewed name for ${hex}.`);
    const issue = validateName(entry.name);
    if (issue) throw new Error(`${issue}: ${entry.name}.`);
    const name = normalizeName(entry.name);
    if (names.has(name)) throw new Error(`Repeated name ${entry.name}.`);
    names.add(name);
    if (color.source !== 'named-colors') {
      const prefix = name.split(' ')[0]!;
      const count = (prefixes.get(prefix) ?? 0) + 1;
      prefixes.set(prefix, count);
      if (count > 12) throw new Error(`Overused name prefix ${prefix}.`);
    }
    entriesByHex.set(hex, { hex: color.hex, name: entry.name });
  }
  return queue.map((color) => {
    const entry = entriesByHex.get(color.hex.toUpperCase());
    if (!entry) throw new Error(`Candidate does not cover ${color.hex}.`);
    return entry;
  });
}

export function namingConflicts<T extends { hex: string; currentName?: string }>(
  entries: readonly ReviewName[],
  owners: ReadonlyMap<string, string>,
  queue: readonly T[] = [],
): ReviewName[] {
  const queueByHex = new Map(queue.map((color) => [color.hex.toUpperCase(), color]));
  const seen = new Set<string>();
  const prefixCounts = new Map<string, number>();
  const conflicts: ReviewName[] = [];
  for (const entry of entries) {
    const key = normalizeName(entry.name);
    const hex = entry.hex.toUpperCase();
    const ownerHex = owners.get(key);
    const retained = queueByHex.get(hex)?.currentName;
    const foreignOwner =
      ownerHex && ownerHex.toUpperCase() !== hex && normalizeName(retained ?? '') !== key;
    const duplicate = seen.has(key);
    seen.add(key);
    const prefix = key.split(' ')[0]!;
    const prefixCount = (prefixCounts.get(prefix) ?? 0) + 1;
    prefixCounts.set(prefix, prefixCount);
    if (foreignOwner || duplicate || prefixCount > 12) conflicts.push(entry);
  }
  return conflicts;
}
