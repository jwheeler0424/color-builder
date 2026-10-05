import { expect, test } from 'bun:test';
import { stringify } from 'csv-stringify/sync';

import { applyNameOverrides, duplicateNames, parseColorsCsv } from '../scripts/build-colors-csv';
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
