import type { CsvRow } from './build-colors-csv';

export interface DuplicateEdit {
  dataRow: number;
  hex: string;
  originalName: string;
}

export interface NameIssue {
  index: number;
  reason: string;
}

function normalizeName(name: string) {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/[\s-]+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function planDuplicateEdits(
  sourceRows: readonly CsvRow[],
  _reviewRows: readonly CsvRow[],
): DuplicateEdit[] {
  const seen = new Set<string>();
  const edits: DuplicateEdit[] = [];
  sourceRows.forEach((row, index) => {
    const name = row[0] ?? '';
    const key = normalizeName(name);
    if (seen.has(key)) {
      edits.push({ dataRow: index + 1, hex: row[1] ?? '', originalName: name });
    } else {
      seen.add(key);
    }
  });
  return edits;
}

export function descriptiveColorName(row: readonly string[]): string {
  if (row.length !== 17) throw new Error('Invalid HSL values: expected a 17-column color row.');
  const hue = Number(row[13]);
  const saturation = Number(row[14]);
  const lightness = Number(row[15]);
  if (
    !Number.isFinite(hue) ||
    hue < 0 ||
    hue >= 360 ||
    !Number.isFinite(saturation) ||
    saturation < 0 ||
    saturation > 100 ||
    !Number.isFinite(lightness) ||
    lightness < 0 ||
    lightness > 100
  )
    throw new Error('Invalid HSL values.');

  const light = lightness < 35 ? 'dark' : lightness > 70 ? 'light' : 'medium';
  const chroma = saturation < 25 ? 'muted' : saturation < 65 ? 'soft' : 'vivid';
  const family = (row[2] ?? 'color').trim().toLocaleLowerCase('en-US');
  return `${light} ${chroma} ${family} (hue ${Math.round(hue)} degrees; saturation ${Math.round(saturation)}%; lightness ${Math.round(lightness)}%)`;
}

export function parseNameRows(
  rows: readonly Record<string, unknown>[],
  expectedCount: number,
): string[] {
  if (rows.length !== expectedCount) throw new Error('Name rows must cover every queued color.');
  const names = new Array<string>(expectedCount);
  const seen = new Set<number>();
  for (const row of rows) {
    if (Object.keys(row).some((key) => key !== 'id' && key !== 'name'))
      throw new Error('Name rows may contain only an id and name.');
    const id = row.id;
    if (
      !Number.isInteger(id) ||
      (id as number) < 1 ||
      (id as number) > expectedCount ||
      seen.has(id as number)
    )
      throw new Error('Name row IDs must be distinct and in-range.');
    if (typeof row.name !== 'string' || !row.name.trim()) throw new Error('Name row is invalid.');
    seen.add(id as number);
    names[(id as number) - 1] = row.name;
  }
  if (seen.size !== expectedCount) throw new Error('Name rows must cover every queued color.');
  return names;
}

export function nameIssues(
  names: readonly string[],
  existingNames: ReadonlySet<string>,
): NameIssue[] {
  const issues: NameIssue[] = [];
  const seen = new Set<string>();
  names.forEach((name, index) => {
    const normalized = normalizeName(name);
    if (existingNames.has(normalized)) issues.push({ index, reason: 'Name is already owned.' });
    if (seen.has(normalized)) issues.push({ index, reason: 'Repeated name.' });
    if (normalized === 'deep crimson') issues.push({ index, reason: 'Generic name.' });
    if (/\b\d+\b/.test(name) || /^[\da-f]{6}$/i.test(name.trim()))
      issues.push({ index, reason: 'Color code, numeric label, or color formula.' });
    seen.add(normalized);
  });
  return issues;
}
