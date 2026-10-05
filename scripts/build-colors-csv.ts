import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type ColorRow = string[];
export type NameOverride = {
  dataRow: number;
  hex: string;
  originalName: string;
  name: string;
};

const DIRECTORY = new URL('./color-db/names/', import.meta.url);
const SOURCE = fileURLToPath(new URL('combined-color-queue.csv', DIRECTORY));
const OUTPUT = fileURLToPath(new URL('colors.csv', DIRECTORY));
const REPORT = fileURLToPath(new URL('duplicate-color-names.csv', DIRECTORY));
const OVERRIDES = fileURLToPath(new URL('duplicate-name-overrides.json', DIRECTORY));

export function normalizedName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase();
}

export function parseColorsCsv(text: string): { header: string[]; rows: ColorRow[] } {
  const records = parse(text, { bom: true }) as string[][];
  const [header, ...rows] = records;
  if (!header || header.length !== 17 || header[0] !== 'Color Name' || header[1] !== 'HEX Code')
    throw new Error("Expected the source CSV's 17-column color schema");
  for (const [index, row] of rows.entries()) {
    if (
      row.length !== header.length ||
      !/^#[0-9a-f]{6}$/i.test(row[1] ?? '') ||
      !normalizedName(row[0] ?? '')
    )
      throw new Error(`Invalid color record at data row ${index + 1}`);
  }
  return { header, rows };
}

export function duplicateNames(rows: ColorRow[]): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const key = normalizedName(row[0]!);
    const group = groups.get(key) ?? [];
    group.push(index + 1);
    groups.set(key, group);
  });
  return new Map([...groups].filter(([, group]) => group.length > 1));
}

export function applyNameOverrides(rows: ColorRow[], overrides: NameOverride[]): ColorRow[] {
  const output = rows.map((row) => [...row]);
  const duplicates = duplicateNames(rows);
  const usedRows = new Set<number>();
  const originalNames = new Set(rows.map((row) => normalizedName(row[0]!)));
  const replacementNames = new Set<string>();
  for (const override of overrides) {
    const { dataRow, hex, originalName, name } = override;
    const row = rows[dataRow - 1];
    if (!Number.isInteger(dataRow) || !row || usedRows.has(dataRow))
      throw new Error(`Invalid or repeated override data row ${dataRow}`);
    if (row[1] !== hex || row[0] !== originalName)
      throw new Error(`Override no longer matches source data row ${dataRow}`);
    if (!duplicates.has(normalizedName(originalName)))
      throw new Error(`Data row ${dataRow} does not have a duplicate source name`);
    if (typeof name !== 'string' || name !== name.trim() || name.length < 3 || /\p{Cc}/u.test(name))
      throw new Error(`Invalid handwritten name at data row ${dataRow}`);
    const key = normalizedName(name);
    if (replacementNames.has(key) || originalNames.has(key))
      throw new Error(`Handwritten name already belongs to another source row: ${name}`);
    usedRows.add(dataRow);
    replacementNames.add(key);
    output[dataRow - 1]![0] = name;
  }
  return output;
}

export function main(): void {
  const sourceText = readFileSync(SOURCE, 'utf8');
  const { header, rows } = parseColorsCsv(sourceText);
  const overrides = existsSync(OVERRIDES)
    ? (JSON.parse(readFileSync(OVERRIDES, 'utf8')) as NameOverride[])
    : [];
  if (!Array.isArray(overrides)) throw new Error('Handwritten overrides must be a JSON array');
  const renamed = applyNameOverrides(rows, overrides);
  if (existsSync(OUTPUT)) {
    const current = parseColorsCsv(readFileSync(OUTPUT, 'utf8'));
    if (
      JSON.stringify(current.header) !== JSON.stringify(header) ||
      current.rows.length !== rows.length
    )
      throw new Error(
        'Existing colors.csv has a different schema or row count; refusing to overwrite',
      );
    for (let index = 0; index < rows.length; index++) {
      if (JSON.stringify(current.rows[index]!.slice(1)) !== JSON.stringify(rows[index]!.slice(1)))
        throw new Error(`Existing colors.csv non-name data changed at data row ${index + 1}`);
      if (
        current.rows[index]![0] !== rows[index]![0] &&
        current.rows[index]![0] !== renamed[index]![0]
      )
        throw new Error(
          `Unrecorded manual name at data row ${index + 1}; preserve it in the override file first`,
        );
    }
  }
  if (!overrides.length) copyFileSync(SOURCE, `${OUTPUT}.tmp`);
  else
    writeFileSync(
      `${OUTPUT}.tmp`,
      stringify([header, ...renamed], { quoted: true, record_delimiter: '\n' }),
    );
  renameSync(`${OUTPUT}.tmp`, OUTPUT);
  const duplicates = duplicateNames(renamed);
  const report: (string | number)[][] = [
    ['Data Row', 'Color Name', 'HEX Code', 'Occurrences', 'Needs Rename'],
  ];
  let remaining = 0;
  for (const [, group] of duplicates) {
    remaining += group.length - 1;
    group.forEach((dataRow, index) => {
      const row = renamed[dataRow - 1]!;
      report.push([
        dataRow,
        row[0]!,
        row[1]!,
        group.length,
        index === 0 ? 'keep one occurrence' : 'yes',
      ]);
    });
  }
  writeFileSync(REPORT, stringify(report, { header: false, quoted: true, record_delimiter: '\n' }));
  console.log(`Copied ${rows.length} colors and all ${header.length} columns to ${OUTPUT}.`);
  console.log(
    `Applied ${overrides.length} handwritten name overrides; all non-name fields preserved.`,
  );
  console.log(
    `Remaining: ${duplicates.size} duplicate-name groups; ${remaining} names need replacement.`,
  );
  console.log(`Duplicate report: ${REPORT}`);
  if (process.argv.includes('--require-unique') && duplicates.size)
    throw new Error('colors.csv still has duplicate names; manual review is not complete');
}

if (import.meta.main) main();
