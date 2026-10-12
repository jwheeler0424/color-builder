import { parse } from 'csv-parse/sync';

export type CsvRow = string[];

export interface NameOverride {
  dataRow: number;
  hex: string;
  originalName: string;
  name: string;
}

export function parseColorsCsv(input: string): { header: CsvRow; rows: CsvRow[] } {
  const records = parse(input, { skip_empty_lines: true, bom: true }) as CsvRow[];
  const header = records[0];
  if (!header || header.length !== 17) throw new Error('Expected a 17-column color CSV.');
  const rows = records.slice(1);
  if (rows.some((row) => row.length !== header.length))
    throw new Error('Expected every color row to contain 17 columns.');
  return { header, rows };
}

function normalizeName(name: string) {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/[\s-]+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function duplicateNames(rows: readonly CsvRow[]): Map<string, number[]> {
  const occurrences = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const name = row[0];
    if (name === undefined) return;
    const key = normalizeName(name);
    if (!key) return;
    const indexes = occurrences.get(key) ?? [];
    indexes.push(index + 1);
    occurrences.set(key, indexes);
  });
  return new Map([...occurrences].filter(([, indexes]) => indexes.length > 1));
}

export function applyNameOverrides(
  rows: readonly CsvRow[],
  overrides: readonly NameOverride[],
): CsvRow[] {
  const result = rows.map((row) => [...row]);
  const usedRows = new Set<number>();
  const duplicateRows = duplicateNames(rows);
  for (const override of overrides) {
    if (
      !Number.isInteger(override.dataRow) ||
      override.dataRow < 1 ||
      usedRows.has(override.dataRow)
    )
      throw new Error('An override has a repeated or invalid source row.');
    usedRows.add(override.dataRow);
    const row = result[override.dataRow - 1];
    const duplicates = duplicateRows.get(normalizeName(override.originalName));
    if (!duplicates || duplicates[0] === override.dataRow || !duplicates.includes(override.dataRow))
      throw new Error(`Override is not a duplicate source row: ${override.dataRow}.`);
    if (
      !row ||
      row[0] !== override.originalName ||
      row[1]?.toUpperCase() !== override.hex.toUpperCase()
    )
      throw new Error(`Override no longer matches source row ${override.dataRow}.`);
    const nextName = override.name.trim();
    if (!nextName || nextName !== override.name) throw new Error('Override name is invalid.');
    const key = normalizeName(nextName);
    if (
      result.some(
        (candidate, index) =>
          index !== override.dataRow - 1 && normalizeName(candidate[0] ?? '') === key,
      )
    )
      throw new Error('Override name belongs to another source row.');
    row[0] = nextName;
  }
  return result;
}
