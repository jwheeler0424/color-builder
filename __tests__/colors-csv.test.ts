import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { stringify } from 'csv-stringify/sync';

import {
  assertUnfilledRenameQueue,
  auditColorNames,
  namingIssues,
  verifyCatalogNames,
} from '../scripts/audit-color-names';
import { applyNameOverrides, duplicateNames, parseColorsCsv } from '../scripts/build-colors-csv';
import {
  applyRenameProposals,
  updateDatabaseNames,
  validateRenameProposals,
} from '../scripts/fill-color-name-renames';
import {
  descriptiveColorName,
  nameIssues,
  parseNameRows,
  planDuplicateEdits,
} from '../scripts/review-csv-duplicates';

const header = [
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
const row = (name: string, hex: string) => [
  name,
  hex,
  'Red',
  'Quoted "petal", with\na newline',
  'Warm',
  'Bold',
  'Calm',
  'Joy',
  'Design',
  'One, Two',
  '100',
  '20',
  '30',
  '350',
  '50',
  '25',
  'Dark',
];
const rows = [row('Rose', '#AA1122'), row(' rose ', '#BB2233'), row('Claret', '#CC3344')];

test('CSV parsing round-trips quoted commas, quotes, newlines and all 17 fields', () => {
  expect(parseColorsCsv(stringify([header, ...rows]))).toEqual({ header, rows });
  expect(() => parseColorsCsv('Color Name,HEX Code\nRose,#AA1122')).toThrow('17-column');
});

test('duplicate audit is case-insensitive and uses data-row indices', () => {
  expect([...duplicateNames(rows)]).toEqual([['rose', [1, 2]]]);
});

test('handwritten overrides change only the name and preserve source rows', () => {
  const result = applyNameOverrides(rows, [
    { dataRow: 2, hex: '#BB2233', originalName: ' rose ', name: 'Camellia Wax Impression' },
  ]);
  expect(result[1]![0]).toBe('Camellia Wax Impression');
  expect(result.map((entry) => entry.slice(1))).toEqual(rows.map((entry) => entry.slice(1)));
  expect(rows[1]![0]).toBe(' rose ');
  expect(duplicateNames(result).size).toBe(0);
});

test('handwritten overrides reject wrong rows, unique-name edits and new clashes', () => {
  const override = {
    dataRow: 2,
    hex: '#BB2233',
    originalName: ' rose ',
    name: 'Camellia Wax Impression',
  };
  expect(() => applyNameOverrides(rows, [{ ...override, hex: '#000000' }])).toThrow('matches');
  expect(() => applyNameOverrides(rows, [{ ...override, name: 'CLARET' }])).toThrow('belongs');
  expect(() => applyNameOverrides(rows, [override, override])).toThrow('repeated');
  expect(() =>
    applyNameOverrides(rows, [{ ...override, dataRow: 3, hex: '#CC3344', originalName: 'Claret' }]),
  ).toThrow('duplicate source');
});

test('parallel edit planning retains one original occurrence and assigns each duplicate row once', () => {
  const source = [...rows, row('Claret', '#DD4455'), row('ROSE', '#EE5566')];
  const planned = planDuplicateEdits(source, source);
  expect(planned.map((entry) => entry.dataRow)).toEqual([2, 4, 5]);
  expect(new Set(planned.map((entry) => entry.dataRow)).size).toBe(3);
  expect(planned[0]).toEqual({ dataRow: 2, hex: '#BB2233', originalName: ' rose ' });
});

test('rule-based names describe the row HSL values without using its hex', () => {
  expect(descriptiveColorName(rows[0]!)).toBe(
    'dark soft red (hue 350 degrees; saturation 50%; lightness 25%)',
  );
  expect(() => descriptiveColorName([...rows[0]!.slice(0, 13), '360', '50', '25'])).toThrow(
    'Invalid HSL values',
  );
});

test('model row IDs cannot change hexes or omit or repeat records', () => {
  expect(
    parseNameRows(
      [
        { id: 2, name: 'Batik Stamp' },
        { id: 1, name: 'Karkade Jelly' },
      ],
      2,
    ),
  ).toEqual(['Karkade Jelly', 'Batik Stamp']);
  expect(() =>
    parseNameRows(
      [
        { id: 1, name: 'Karkade Jelly' },
        { id: 1, name: 'Batik Stamp' },
      ],
      2,
    ),
  ).toThrow('distinct');
  expect(() => parseNameRows([{ id: 1, name: 'Karkade Jelly', hex: '#000000' }], 1)).toThrow(
    'only',
  );
});

test('global uniqueness and handwritten-name guards flag only invalid proposals', () => {
  const issues = nameIssues(
    ['Karkade Jelly', 'ROSE', 'Karkade Jelly', 'Rose 200', 'Deep Crimson'],
    new Set(['rose']),
  );
  expect(issues.map((issue) => issue.index)).toEqual([1, 2, 3, 4]);
  expect(
    nameIssues(['Cranberry Cloisonne'], new Set(['cranberry cloisonne']))[0]?.reason,
  ).toContain('owned');
});

test('name audit flags codes, formulas, parentheses and names over three words', () => {
  expect(namingIssues('Garden Gate')).toEqual([]);
  expect(namingIssues('Batik Stamp')).toEqual([]);
  expect(namingIssues('Green Sea (Hex #548E62)')).toContain('Parentheses');
  expect(namingIssues('Rose 200')).toContain('Color code, numeric label, or color formula');
  expect(namingIssues('A Very Long Name')).toContain('More than three words');
  expect(namingIssues('Deep Soft Crimson')).toEqual([]);
  expect(namingIssues('Light Pale Greenish-Blue')).toEqual([]);
  expect(namingIssues('Cyan-Green Beige')).toEqual([]);
  expect(namingIssues('Eclectic Lilac')).toEqual([]);
  expect(namingIssues('Lavender Mist')).toEqual([]);
  expect(namingIssues('Midnight Black')).toEqual([]);
  expect(namingIssues('Fuschia Magenta')).toEqual([]);
  expect(namingIssues('ABCDEF', '#ABCDEF')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('Cafeed', '#CAFEED')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('Cafe', '#CAFEED')).toEqual([]);
  expect(namingIssues('Rose \uff14\uff12')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(
    namingIssues('dark soft red (hue 350 degrees; saturation 50%; lightness 25%)'),
  ).toHaveLength(3);
});

test('formulaic structure or spelling alone does not queue a name for renaming', () => {
  expect(
    auditColorNames([
      row('Deep Soft Crimson', '#AA1122'),
      row('Eclectic Lilac', '#CC3344'),
      row('Fuschia Magenta', '#BB2233'),
      row('Fuscia', '#223344'),
      row('Redish', '#334455'),
      row('Blueish', '#445566'),
    ]),
  ).toEqual([]);
});

test('reviewed handwritten references are exempt only for their exact name and hex', () => {
  expect(namingIssues('Windows 95 Desktop', '#018281')).toEqual([]);
  expect(namingIssues("Summer of '82", '#74cdd8')).toEqual([]);
  expect(namingIssues('Batch Brew', '#45392F')).toEqual([]);
  expect(namingIssues('French 75', '#F9F3D5')).toEqual([]);
  expect(namingIssues('24 Karat Gold', '#BB9911')).toEqual([]);
  expect(namingIssues('Oat Kiln Batch', '#AB8C39')).toEqual([]);
  expect(namingIssues('CO\u2082', '#CADFEC')).toEqual([]);
  expect(namingIssues('H\u2082O', '#BFE1E6')).toEqual([]);
  expect(namingIssues('MoS\u2082 Cyan', '#00E6D3')).toEqual([]);
  expect(namingIssues('Pi\u00b2', '#986960')).toEqual([]);
  expect(namingIssues('999', '#DD1166')).toContain('Color code, numeric label, or color formula');
  expect(namingIssues('Windows 95 Desktop', '#123456')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('Windows 96 Desktop', '#018281')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('Green 383', '#3E3D29')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('RAL 1001 Beige', '#C2B078')).toContain(
    'Color code, numeric label, or color formula',
  );
  expect(namingIssues('D829DE', '#D829DE')).toContain(
    'Color code, numeric label, or color formula',
  );
  const audit = auditColorNames([
    row('Windows 95 Desktop', '#018281'),
    row('Windows 95 Desktop', '#123456'),
  ]);
  expect(audit).toHaveLength(1);
  expect(audit[0]!.duplicateKeeper).toBe(1);
});

test('CSS names belong to exact hex colors even when the correct row occurs later', () => {
  const source = [row('Red', '#AA1122'), row('red', '#ff0000'), row('Pond', '#0000FF')];
  const audit = auditColorNames(source);
  expect(audit.map((entry) => entry.dataRow)).toEqual([1, 3]);
  expect(audit[0]!.reasons).toContain('CSS name reserved for #FF0000');
  expect(audit[0]!.duplicateKeeper).toBe(2);
  expect(audit[1]!.suggestedCssName).toBe('blue');
  expect(source[2]![0]).toBe('Pond');
});

test('CSS aliases and capitalized space-separated keywords are preserved for matching hexes', () => {
  expect(
    auditColorNames([
      row('Cyan', '#00FFFF'),
      row('Grey', '#808080'),
      row('DarkRed', '#8B0000'),
      row('Light Blue', '#ADD8E6'),
      row('Light Slate Grey', '#778899'),
      row('Medium Violet Red', '#C71585'),
    ]),
  ).toEqual([]);
  const audit = auditColorNames([row('Light Blue', '#ADD8E6'), row('Light Blue', '#123456')]);
  expect(audit).toHaveLength(1);
  expect(audit[0]!.dataRow).toBe(2);
  expect(audit[0]!.duplicateKeeper).toBe(1);
  expect(audit[0]!.reasons).toContain('CSS name reserved for #ADD8E6');
});

test('space-separated CSS names still obey the three-word limit', () => {
  const audit = auditColorNames([row('Light Golden Rod Yellow', '#FAFAD2')]);
  expect(audit[0]!.reasons).toEqual(['More than three words']);
});

test('duplicate names normalize Unicode and repeated whitespace and prefer a clean keeper', () => {
  const audit = auditColorNames([row('Garden  Gate', '#112233'), row('Ｇarden Gate', '#223344')]);
  expect(audit).toHaveLength(1);
  expect(audit[0]!.dataRow).toBe(2);
  expect(audit[0]!.duplicateKeeper).toBe(1);
});

test('CSV/SQLite name verification matches by hex independent of order and hex casing', () => {
  expect(() =>
    verifyCatalogNames(rows, [
      { hex: '#cc3344', name: 'Claret' },
      { hex: '#aa1122', name: 'Rose' },
      { hex: '#BB2233', name: ' rose ' },
    ]),
  ).not.toThrow();
});

test('CSV/SQLite name verification rejects stale names, missing colors and repeated hexes', () => {
  const records = rows.map((entry) => ({ hex: entry[1]!, name: entry[0]! }));
  expect(() =>
    verifyCatalogNames(rows, [{ ...records[0]!, name: 'Outdated' }, ...records.slice(1)]),
  ).toThrow('different CSV/SQLite names');
  expect(() => verifyCatalogNames(rows, records.slice(1))).toThrow('missing from SQLite');
  expect(() => verifyCatalogNames(rows.slice(1), records)).toThrow('missing from CSV');
  expect(() => verifyCatalogNames(rows, [...records, records[0]!])).toThrow('SQLite repeats hex');
  expect(() => verifyCatalogNames([...rows, rows[0]!], records)).toThrow('CSV repeats hex');
});

test('replacement proposals reject catalog collisions, repeated proposals and invalid names', () => {
  const proposal = {
    dataRow: 1,
    hex: '#AA1122',
    currentName: 'Rose',
    name: 'Cranberry Ticket Stub',
  };
  expect(() => validateRenameProposals(rows, [proposal])).not.toThrow();
  expect(() => validateRenameProposals(rows, [{ ...proposal, name: 'CLARET' }])).toThrow(
    'existing-name collision',
  );
  expect(() => validateRenameProposals(rows, [{ ...proposal, name: 'A Name Too Long' }])).toThrow(
    'invalid replacement',
  );
  expect(() => validateRenameProposals(rows, [{ ...proposal, name: 'Rose 42' }])).toThrow(
    'invalid replacement',
  );
  expect(() =>
    validateRenameProposals(rows, [
      proposal,
      { dataRow: 3, hex: '#CC3344', currentName: 'Claret', name: 'cranberry-ticket-stub' },
    ]),
  ).toThrow('repeated proposal');
  expect(() => validateRenameProposals(rows, [{ ...proposal, hex: '#123456' }])).toThrow(
    'matches source',
  );
});

test('audit refuses to overwrite any queue containing authored replacement names', () => {
  expect(() => assertUnfilledRenameQueue('"New Name"\n""\n')).not.toThrow();
  expect(() => assertUnfilledRenameQueue('"New Name"\n"Cherry Ticket Booth"\n')).toThrow(
    'refusing to overwrite',
  );
});

test('applying reviewed proposals changes only names and permits an already-applied queue', () => {
  const proposal = {
    dataRow: 1,
    hex: '#AA1122',
    currentName: 'Rose',
    name: 'Cranberry Ticket Stub',
  };
  const result = applyRenameProposals(rows, [proposal]);
  expect(result[0]![0]).toBe(proposal.name);
  expect(result.map((entry) => entry.slice(1))).toEqual(rows.map((entry) => entry.slice(1)));
  expect(rows[0]![0]).toBe('Rose');
  expect(applyRenameProposals(result, [proposal])).toEqual(result);
  expect(() => applyRenameProposals(rows, [proposal, proposal])).toThrow('Repeated data row');
});

test('SQLite renames update both name tables transactionally and preserve coordinates', () => {
  const database = new Database(':memory:');
  try {
    database.run(
      'CREATE TABLE colors ("HEX Code" TEXT PRIMARY KEY, "Color Name" TEXT UNIQUE, value INTEGER)',
    );
    database.run('CREATE TABLE color_oklab (hex TEXT PRIMARY KEY, name TEXT, l REAL)');
    database.run('INSERT INTO colors VALUES (?, ?, ?)', ['#AA1122', 'Rose', 42]);
    database.run('INSERT INTO color_oklab VALUES (?, ?, ?)', ['#aa1122', 'Rose', 0.5]);
    const proposal = {
      dataRow: 1,
      hex: '#AA1122',
      currentName: 'Rose',
      name: 'Cranberry Ticket Stub',
    };
    updateDatabaseNames(database, [proposal]);
    expect(database.query('SELECT * FROM colors').get()).toEqual({
      'HEX Code': '#AA1122',
      'Color Name': proposal.name,
      value: 42,
    });
    expect(database.query('SELECT * FROM color_oklab').get()).toEqual({
      hex: '#aa1122',
      name: proposal.name,
      l: 0.5,
    });
    expect(() =>
      updateDatabaseNames(database, [
        { ...proposal, currentName: proposal.name, name: 'Another Name' },
        { ...proposal, hex: '#123456' },
      ]),
    ).toThrow('no longer matches');
    expect(database.query('SELECT name FROM color_oklab').get()).toEqual({ name: proposal.name });
    expect(database.query('SELECT "Color Name" AS name FROM colors').get()).toEqual({
      name: proposal.name,
    });
  } finally {
    database.close();
  }
});
