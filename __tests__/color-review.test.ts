import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  mapWorkerRows,
  namingConflicts,
  parseQueue,
  parseWorkerOutput,
  partitionPending,
  publishJson,
  validateCandidate,
} from '../scripts/review-color-batches';

const header = 'hex | current name | source | family | tone | oklch';
const queue = parseQueue(
  `${header}\n#AB0248 | Painted Royal Carmine | composed | Red | medium/strong | L0.48 C0.190 H8\n#983D53 | Algae Red | named-colors | Red | medium/moderate | L0.49 C0.123 H8\n`,
);

test('atomic publication exposes complete JSON and never overwrites existing batches', () => {
  const directory = mkdtempSync(join(tmpdir(), 'color-review-'));
  try {
    const path = join(directory, 'batch.json');
    publishJson(path, [{ hex: '#AB0248', name: 'Roselle Wax Seal' }]);
    const saved = readFileSync(path, 'utf8');
    expect(JSON.parse(saved)).toHaveLength(1);
    expect(() => publishJson(path, [])).toThrow();
    expect(readFileSync(path, 'utf8')).toBe(saved);
    expect(readdirSync(directory)).toEqual(['batch.json']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('parallel assignments use disjoint complete batches and preserve pending order', () => {
  const colors = Array.from({ length: 900 }, (_, index) => ({
    ...queue[0]!,
    hex: `#${index.toString(16).padStart(6, '0').toUpperCase()}`,
  }));
  const assignments = partitionPending(colors, 10);
  expect(assignments.map((assignment) => assignment.batch)).toEqual([10, 11, 12]);
  expect(assignments.map((assignment) => assignment.queue.length)).toEqual([300, 300, 300]);
  expect(assignments.flatMap((assignment) => assignment.queue)).toEqual(colors);
  expect(() => partitionPending(colors.slice(1), 10)).toThrow('complete');
  expect(() => partitionPending([...colors.slice(0, 899), colors[0]!], 10)).toThrow('repeats');
});

test('queue parsing preserves source names and rejects repeated hexes', () => {
  expect(queue).toHaveLength(2);
  expect(queue[1]?.currentName).toBe('Algae Red');
  expect(() =>
    parseQueue(
      `${header}\n#AB0248 | A | composed | Red | medium/strong | H8\n#AB0248 | B | composed | Red | medium/strong | H8`,
    ),
  ).toThrow('repeats');
  expect(() => parseQueue('wrong header')).toThrow('header');
});

test('candidate validation requires exact queue coverage and restores queue order', () => {
  const entries = [
    { hex: '#983D53', name: 'Algae Red' },
    { hex: '#AB0248', name: 'Roselle Wax Seal' },
  ];
  expect(validateCandidate(entries, queue).map((entry) => entry.hex)).toEqual([
    '#AB0248',
    '#983D53',
  ]);
  expect(() => validateCandidate(entries.slice(1), queue)).toThrow('exactly');
  expect(() =>
    validateCandidate([entries[0], { hex: '#000000', name: 'Not Queued' }], queue),
  ).toThrow('Unqueued');
  expect(() => validateCandidate([entries[0], entries[0]], queue)).toThrow('repeated hex');
});

test('worker row IDs map to immutable queued hexes and require exact coverage', () => {
  expect(
    mapWorkerRows(
      [
        { id: 2, name: 'Algae Red' },
        { id: 1, name: 'Roselle Wax Seal' },
      ],
      queue,
    ),
  ).toEqual([
    { hex: '#AB0248', name: 'Roselle Wax Seal' },
    { hex: '#983D53', name: 'Algae Red' },
  ]);
  expect(() =>
    mapWorkerRows(
      [
        { id: 1, name: 'Roselle Wax Seal' },
        { id: 1, name: 'Algae Red' },
      ],
      queue,
    ),
  ).toThrow('distinct');
  expect(() =>
    mapWorkerRows(
      [
        { id: 1, name: 'Roselle Wax Seal' },
        { id: 3, name: 'Algae Red' },
      ],
      queue,
    ),
  ).toThrow('in-range');
  expect(() =>
    mapWorkerRows(
      [
        { id: 1, name: 'Roselle Wax Seal', hex: '#000000' },
        { id: 2, name: 'Algae Red' },
      ],
      queue,
    ),
  ).toThrow('name row');
});

test('candidate validation rejects duplicates, codes, retained compositions and generic stacks', () => {
  const check = (first: string, second = 'Algae Red') =>
    validateCandidate(
      [
        { hex: '#AB0248', name: first },
        { hex: '#983D53', name: second },
      ],
      queue,
    );
  expect(() => check('Roselle Wax Seal', 'roselle wax seal')).toThrow('Repeated name');
  expect(() => check('Painted Royal Carmine')).toThrow('Unreviewed');
  expect(() => check('Maroon 1563')).toThrow('Code');
  expect(() => check('Pure Bright Crimson Pink')).toThrow('Generic');
  expect(() => check(' Roselle Wax Seal')).toThrow('Invalid name');
});

test('candidate validation limits newly authored prefixes without penalizing retained CSV names', () => {
  const colors = Array.from({ length: 13 }, (_, index) => ({
    hex: `#${index.toString(16).padStart(6, '0').toUpperCase()}`,
    currentName: `Existing ${index}`,
    source: 'composed',
    family: 'Red',
    tone: 'medium',
    oklch: 'H8',
  }));
  const entries = colors.map((color, index) => ({
    hex: color.hex,
    name: `Cranberry ${String.fromCharCode(65 + index)} Motif`,
  }));
  expect(() => validateCandidate(entries, colors)).toThrow('Overused');
  expect(
    validateCandidate(
      entries,
      colors.map((color, index) => ({
        ...color,
        source: 'named-colors',
        currentName: entries[index]!.name,
      })),
    ),
  ).toHaveLength(13);
});

test('CLI parser uses completed assistant content and requires a successful result', () => {
  const content = '[{"hex":"#AB0248","name":"Roselle Wax Seal"}]';
  const output = [
    { type: 'assistant.message_delta', data: { delta: 'ignore' } },
    { type: 'assistant.message', data: { content, toolRequests: [] } },
    { type: 'result', exitCode: 0 },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  expect(parseWorkerOutput(output)).toEqual(JSON.parse(content));
  expect(() => parseWorkerOutput(output.replace('"exitCode":0', '"exitCode":1'))).toThrow(
    'successfully',
  );
  expect(() =>
    parseWorkerOutput(
      JSON.stringify({ type: 'assistant.message', data: { content, toolRequests: [{}] } }),
    ),
  ).toThrow('tools');
  expect(() => parseWorkerOutput('{broken')).toThrow();
});

test('ownership checks allow retained owners and flag foreign owners and cross-slice duplicates', () => {
  const owners = new Map([
    ['algae red', '#983D53'],
    ['fuchsia flare', '#FF0077'],
  ]);
  const entries = [
    { hex: '#983D53', name: 'Algae Red' },
    { hex: '#AB0248', name: 'Fuchsia Flare' },
    { hex: '#C61B58', name: 'Roselle Wax Seal' },
    { hex: '#D73366', name: 'roselle wax seal' },
  ];
  expect(namingConflicts(entries, owners).map((entry) => entry.hex)).toEqual([
    '#AB0248',
    '#D73366',
  ]);
});

test('conflict repair flags only names exceeding the full-batch prefix limit', () => {
  const colors = Array.from({ length: 13 }, (_, index) => ({
    hex: `#${index.toString(16).padStart(6, '0').toUpperCase()}`,
    currentName: 'Composed Placeholder',
    source: 'composed',
    family: 'Red',
    tone: 'medium',
    oklch: 'H8',
  }));
  const entries = colors.map((color, index) => ({
    hex: color.hex,
    name: `Garnet ${String.fromCharCode(65 + index)} Motif`,
  }));
  expect(namingConflicts(entries, new Map(), colors)).toEqual([entries[12]!]);
});
