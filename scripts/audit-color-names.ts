import colorNames from 'color-name';
import { parse } from 'csv-parse/sync';

import type { CsvRow } from './build-colors-csv';

import { duplicateNames, parseColorsCsv } from './build-colors-csv';

export interface AuditEntry {
  dataRow: number;
  hex: string;
  name: string;
  reasons: string[];
  duplicateKeeper?: number;
  suggestedCssName?: string;
}

export interface CatalogName {
  hex: string;
  name: string;
}

export interface RenameProposal {
  dataRow: number;
  hex: string;
  currentName: string;
  name: string;
}

const reviewedNumericNames = new Map<string, string>([
  ['windows 95 desktop', '#018281'],
  ["summer of '82", '#74CDD8'],
  ['french 75', '#F9F3D5'],
  ['24 karat gold', '#BB9911'],
  ['oat kiln batch', '#AB8C39'],
  ['co2', '#CADFEC'],
  ['h2o', '#BFE1E6'],
  ['mos2 cyan', '#00E6D3'],
  ['pi2', '#986960'],
]);

export function normalizeColorName(name: string) {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/[\s-]+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function compactName(name: string) {
  return normalizeColorName(name).replace(/[\s-]+/g, '');
}

function canonicalHex(hex: string) {
  const match = /^#?([\da-f]{6})$/i.exec(hex.trim());
  return match ? `#${match[1]!.toUpperCase()}` : null;
}

const cssHexByName = new Map(
  Object.entries(colorNames).map(([name, rgb]) => [
    name.toLocaleLowerCase('en-US'),
    `#${rgb
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`,
  ]),
);
const cssNameByHex = new Map([...cssHexByName].map(([name, hex]) => [hex, name]));

export function namingIssues(name: string, hex?: string): string[] {
  const reasons: string[] = [];
  const normalized = normalizeColorName(name);
  if (!normalized || name.trim() !== name) reasons.push('Invalid name');
  if (/[()]/.test(name)) reasons.push('Parentheses');
  const isFormula = /\b(?:hue|saturation|lightness|hex code)\b|%|#[\da-f]{3,8}/i.test(name);
  if (isFormula) reasons.push('Formulaic description');
  if (name.trim().split(/\s+/).filter(Boolean).length > 3) reasons.push('More than three words');

  const reviewedHex = reviewedNumericNames.get(normalized);
  if (
    !isFormula &&
    /\d/.test(normalized) &&
    (!reviewedHex || canonicalHex(hex ?? '') !== reviewedHex)
  ) {
    reasons.push('Color code, numeric label, or color formula');
  }
  if (/^[\da-f]{6}$/i.test(name.trim())) {
    reasons.push('Color code, numeric label, or color formula');
  }
  if (normalized === 'deep crimson') reasons.push('Generic name');

  const cssHex = cssHexByName.get(compactName(name));
  if (cssHex && canonicalHex(hex ?? '') && cssHex !== canonicalHex(hex!)) {
    reasons.push(`CSS name reserved for ${cssHex}`);
  }
  return [...new Set(reasons)];
}

export function auditColorNames(rows: readonly CsvRow[]): AuditEntry[] {
  const duplicates = duplicateNames(rows);
  const keepers = new Map<string, number>();
  for (const [name, indexes] of duplicates) {
    const cssKeeper = indexes.find((dataRow) => {
      const row = rows[dataRow - 1]!;
      const cssHex = cssHexByName.get(compactName(row[0] ?? ''));
      return cssHex !== undefined && cssHex === canonicalHex(row[1] ?? '');
    });
    keepers.set(name, cssKeeper ?? indexes[0]!);
  }
  const result: AuditEntry[] = [];

  rows.forEach((row, index) => {
    const name = row[0] ?? '';
    const hex = row[1] ?? '';
    const dataRow = index + 1;
    const normalized = normalizeColorName(name);
    const reasons = namingIssues(name, hex);
    const duplicateKeeper = keepers.get(normalized);
    if (duplicateKeeper !== undefined && duplicateKeeper !== dataRow)
      reasons.push('Duplicate name');

    const canonical = canonicalHex(hex);
    const suggestedCssName = canonical ? cssNameByHex.get(canonical) : undefined;
    if (suggestedCssName && compactName(suggestedCssName) !== compactName(name))
      reasons.push(`CSS color name available: ${suggestedCssName}`);

    if (reasons.length) {
      result.push({
        dataRow,
        hex,
        name,
        reasons: [...new Set(reasons)],
        ...(duplicateKeeper !== undefined ? { duplicateKeeper } : {}),
        ...(suggestedCssName ? { suggestedCssName } : {}),
      });
    }
  });
  return result;
}

export function verifyCatalogNames(rows: readonly CsvRow[], records: readonly CatalogName[]): void {
  const csvByHex = new Map<string, string>();
  for (const row of rows) {
    const hex = canonicalHex(row[1] ?? '');
    if (!hex) throw new Error('CSV contains an invalid hex.');
    if (csvByHex.has(hex)) throw new Error('CSV repeats hex.');
    csvByHex.set(hex, row[0] ?? '');
  }
  const dbByHex = new Map<string, string>();
  for (const record of records) {
    const hex = canonicalHex(record.hex);
    if (!hex) throw new Error('SQLite contains an invalid hex.');
    if (dbByHex.has(hex)) throw new Error('SQLite repeats hex.');
    dbByHex.set(hex, record.name);
  }
  for (const [hex, name] of csvByHex) {
    if (!dbByHex.has(hex)) throw new Error(`${hex} is missing from SQLite.`);
    if (dbByHex.get(hex) !== name) throw new Error(`${hex} has different CSV/SQLite names.`);
  }
  for (const hex of dbByHex.keys()) {
    if (!csvByHex.has(hex)) throw new Error(`${hex} is missing from CSV.`);
  }
}

export function assertUnfilledRenameQueue(input: string): void {
  const rows = parse(input, { skip_empty_lines: true, bom: true }) as string[][];
  if (rows.length < 2) return;
  const header = rows[0]!.map((value) => normalizeColorName(value));
  const nameIndex = header.findIndex((value) => /^(new )?name$/.test(value));
  const candidateIndex = nameIndex >= 0 ? nameIndex : rows[1]!.length - 1;
  if (rows.slice(1).some((row) => Boolean(row[candidateIndex]?.trim())))
    throw new Error('refusing to overwrite a queue containing authored replacement names.');
}

export function validateRenameProposals(
  rows: readonly CsvRow[],
  proposals: readonly RenameProposal[],
): RenameProposal[] {
  const seenRows = new Set<number>();
  const proposedNames = new Set<string>();
  const catalogNames = new Set(rows.map((row) => normalizeColorName(row[0] ?? '')));

  for (const proposal of proposals) {
    if (
      !Number.isInteger(proposal.dataRow) ||
      proposal.dataRow < 1 ||
      seenRows.has(proposal.dataRow)
    )
      throw new Error('Repeated proposal data row.');
    seenRows.add(proposal.dataRow);
    const row = rows[proposal.dataRow - 1];
    if (
      !row ||
      canonicalHex(row[1] ?? '') !== canonicalHex(proposal.hex) ||
      row[0] !== proposal.currentName
    )
      throw new Error(`Proposal no longer matches source row ${proposal.dataRow}.`);
    const name = normalizeColorName(proposal.name);
    if (namingIssues(proposal.name, proposal.hex).length)
      throw new Error('invalid replacement name.');
    if (catalogNames.has(name) && name !== normalizeColorName(proposal.currentName))
      throw new Error(`Replacement name has an existing-name collision: ${proposal.name}.`);
    if (proposedNames.has(name)) throw new Error(`repeated proposal name: ${proposal.name}.`);
    proposedNames.add(name);
  }
  return proposals.map((proposal) => ({ ...proposal }));
}

export function applyRenameProposals(
  rows: readonly CsvRow[],
  proposals: readonly RenameProposal[],
): CsvRow[] {
  const output = rows.map((row) => [...row]);
  const seenRows = new Set<number>();
  for (const proposal of proposals) {
    if (seenRows.has(proposal.dataRow)) throw new Error('Repeated data row.');
    seenRows.add(proposal.dataRow);
    const row = output[proposal.dataRow - 1];
    if (!row || canonicalHex(row[1] ?? '') !== canonicalHex(proposal.hex))
      throw new Error(`Proposal no longer matches source row ${proposal.dataRow}.`);
    if (row[0] === proposal.name) continue;
    if (row[0] !== proposal.currentName)
      throw new Error(`Proposal no longer matches source row ${proposal.dataRow}.`);
    row[0] = proposal.name;
  }
  return output;
}

export function updateDatabaseNames(
  database: import('bun:sqlite').Database,
  proposals: readonly RenameProposal[],
): void {
  const update = database.transaction(() => {
    for (const proposal of proposals) {
      const color = database
        .query('SELECT "Color Name" AS name FROM colors WHERE upper("HEX Code") = upper(?)')
        .get(proposal.hex) as { name: string } | null;
      const oklab = database
        .query('SELECT name FROM color_oklab WHERE upper(hex) = upper(?)')
        .get(proposal.hex) as { name: string } | null;
      if (
        !color ||
        !oklab ||
        color.name !== proposal.currentName ||
        oklab.name !== proposal.currentName
      )
        throw new Error(`Database row no longer matches ${proposal.hex}.`);
      database
        .query('UPDATE colors SET "Color Name" = ? WHERE upper("HEX Code") = upper(?)')
        .run(proposal.name, proposal.hex);
      database
        .query('UPDATE color_oklab SET name = ? WHERE upper(hex) = upper(?)')
        .run(proposal.name, proposal.hex);
    }
  });
  update();
}

export function catalogRecordsFromCsv(input: string): CatalogName[] {
  return parseColorsCsv(input).rows.map((row) => ({ hex: row[1]!, name: row[0]! }));
}
