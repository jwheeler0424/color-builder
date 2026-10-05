import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { duplicateNames, parseColorsCsv } from './build-colors-csv';

const SOURCE = fileURLToPath(new URL('./color-db/names/colors.csv', import.meta.url));
const OUTPUT_DIR = fileURLToPath(new URL('../src/lib/constants/color-db/', import.meta.url));
const OUTPUT = join(OUTPUT_DIR, 'colors.sqlite');
const TEMP = `${OUTPUT}.tmp`;
const BACKUP = `${OUTPUT}.previous`;
const HEADER = [
  'Color Name',
  'HEX Code',
  'Category',
  'Description',
  'Emotion',
  'Personality',
  'Mood',
  'Symbolism',
  'Use Case',
  'Keywords',
  'R',
  'G',
  'B',
  'Hue',
  'Saturation',
  'Lightness',
  'Contrast Level',
];

type ColorNumbers = [number, number, number, number, number, number];

function colorNumbers(row: string[], dataRow: number): ColorNumbers {
  const values = row.slice(10, 16).map(Number);
  const [red, green, blue, hue, saturation, lightness] = values;
  if (
    values.some((value) => !Number.isFinite(value)) ||
    ![red, green, blue].every((value) => Number.isInteger(value) && value! >= 0 && value! <= 255) ||
    hue! < 0 ||
    hue! >= 360 ||
    saturation! < 0 ||
    saturation! > 100 ||
    lightness! < 0 ||
    lightness! > 100
  )
    throw new Error(`Invalid RGB/HSL values at data row ${dataRow}`);

  const hex = row[1]!.slice(1);
  const hexRgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  if (red !== hexRgb[0] || green !== hexRgb[1] || blue !== hexRgb[2])
    throw new Error(`RGB values do not match HEX Code at data row ${dataRow}`);

  return values as ColorNumbers;
}

function assertLookupIndex(database: Database, hex: string): string {
  const plan = database
    .query('EXPLAIN QUERY PLAN SELECT "Color Name" FROM colors WHERE "HEX Code" = ?')
    .get(hex) as { detail: string } | null;
  if (!plan?.detail.includes('PRIMARY KEY'))
    throw new Error(`HEX lookup is not using the primary key: ${plan?.detail ?? 'no query plan'}`);
  return plan.detail;
}

function verifyDatabase(database: Database, expectedRows: number, sampleHex: string): string {
  const result = database.query('PRAGMA quick_check').get() as { quick_check: string };
  if (result.quick_check !== 'ok')
    throw new Error(`SQLite integrity check failed: ${result.quick_check}`);

  const count = (database.query('SELECT count(*) AS count FROM colors').get() as { count: number })
    .count;
  if (count !== expectedRows) throw new Error(`Expected ${expectedRows} rows, found ${count}`);

  const found = database
    .query('SELECT "HEX Code" AS hex FROM colors WHERE "HEX Code" = ?')
    .get(sampleHex) as { hex: string } | null;
  if (found?.hex !== sampleHex) throw new Error(`HEX lookup failed for ${sampleHex}`);
  return assertLookupIndex(database, sampleHex);
}

function publishDatabase(): void {
  if (!existsSync(OUTPUT)) {
    renameSync(TEMP, OUTPUT);
    return;
  }
  if (existsSync(BACKUP))
    throw new Error(`Refusing to replace SQLite while a backup already exists: ${BACKUP}`);

  renameSync(OUTPUT, BACKUP);
  try {
    renameSync(TEMP, OUTPUT);
  } catch (error) {
    renameSync(BACKUP, OUTPUT);
    throw error;
  }
  try {
    rmSync(BACKUP);
  } catch (error) {
    console.warn(
      `New database published, but the previous database remains at ${BACKUP}: ${error}`,
    );
  }
}

function main(): void {
  const { header, rows } = parseColorsCsv(readFileSync(SOURCE, 'utf8'));
  if (JSON.stringify(header) !== JSON.stringify(HEADER))
    throw new Error('colors.csv columns do not match the SQLite schema');
  if (duplicateNames(rows).size) throw new Error('colors.csv contains duplicate normalized names');

  const seenHex = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const hex = row[1]!.toUpperCase();
    if (seenHex.has(hex)) throw new Error(`Duplicate HEX Code at data row ${index + 1}: ${hex}`);
    seenHex.add(hex);
    colorNumbers(row, index + 1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  rmSync(TEMP, { force: true });
  const database = new Database(TEMP, { create: true });
  let open = true;
  try {
    database.run('PRAGMA journal_mode = OFF');
    database.run(`
      CREATE TABLE colors (
        "Color Name"     TEXT NOT NULL UNIQUE,
        "HEX Code"       TEXT NOT NULL PRIMARY KEY,
        "Category"       TEXT NOT NULL,
        "Description"    TEXT NOT NULL,
        "Emotion"        TEXT NOT NULL,
        "Personality"    TEXT NOT NULL,
        "Mood"           TEXT NOT NULL,
        "Symbolism"      TEXT NOT NULL,
        "Use Case"       TEXT NOT NULL,
        "Keywords"       TEXT NOT NULL,
        "R"              INTEGER NOT NULL,
        "G"              INTEGER NOT NULL,
        "B"              INTEGER NOT NULL,
        "Hue"            REAL NOT NULL,
        "Saturation"     REAL NOT NULL,
        "Lightness"      REAL NOT NULL,
        "Contrast Level" TEXT NOT NULL
      ) WITHOUT ROWID
    `);

    const insert = database.prepare(`INSERT INTO colors VALUES (${Array(17).fill('?').join(',')})`);
    database.transaction(() => {
      for (const [index, row] of rows.entries()) {
        const numbers = colorNumbers(row, index + 1);
        insert.run(row[0]!, row[1]!.toUpperCase(), ...row.slice(2, 10), ...numbers, row[16]!);
      }
    })();

    insert.finalize();
    database.run('VACUUM');
    const queryPlan = verifyDatabase(database, rows.length, rows[0]![1]!.toUpperCase());
    database.close();
    open = false;
    publishDatabase();

    const published = new Database(OUTPUT, { readonly: true });
    try {
      verifyDatabase(published, rows.length, rows[0]![1]!.toUpperCase());
    } finally {
      published.close();
    }
    console.log(
      `Imported ${rows.length} colors from ${SOURCE} to ${OUTPUT}; HEX lookup uses ${queryPlan}.`,
    );
  } catch (error) {
    if (open) database.close();
    try {
      rmSync(TEMP, { force: true });
    } catch (cleanupError) {
      console.warn(`Could not remove temporary database ${TEMP}: ${cleanupError}`);
    }
    throw error;
  }
}

if (import.meta.main) main();
