# Named Color Datasets

This folder contains the named sRGB color catalog and its perceptual search
index. Naming is separate from palette computation: the engine can generate
colors without loading these assets.

## Files

| File                                           | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| [colors.csv](colors.csv)                       | Editable source catalog, including `Color Name` and `HEX Code` columns |
| [colors.sqlite](colors.sqlite)                 | SQLite source table plus derived OKLab coordinates and spatial index   |
| [named-color-lookup.ts](named-color-lookup.ts) | Bun-only nearest-name lookup backed by SQLite                          |

At documentation time, the SQLite source table and derived OKLab table each
contain **132,436 colors**. Treat this as a snapshot, not a fixed API constraint.
Use a CSV parser (the repository uses `csv-parse` / `csv-stringify`), not comma
splitting, and preserve all existing columns when changing names.

## Data Model

The SQLite database has three logical tables:

| Table               | Fields / role                                                                     |
| ------------------- | --------------------------------------------------------------------------------- |
| `colors`            | Source catalog; scripts read `"Color Name"` and `"HEX Code"`                      |
| `color_oklab`       | `id`, unique `hex`, `name`, `l`, `a`, `b`; derived OKLab coordinates              |
| `color_oklab_rtree` | `id`, `min_l`, `max_l`, `min_a`, `max_a`, `min_b`, `max_b`; spatial search bounds |

SQLite also manages R-tree shadow tables; do not edit them manually.
The index builder reads `colors`, normalizes its hex values, converts sRGB to
D65 XYZ and then OKLab, and rebuilds both derived tables in a transaction.
It does **not** import the CSV into SQLite or reconcile differing source names.

Maintenance invariants:

- Each source hex identifies one color and must be a six-digit `#RRGGBB` value
  (case-insensitive); runtime normalization produces lowercase `#rrggbb`.
- The CSV and SQLite `colors` table must agree on hex/name pairs and row counts.
- Preserve hex values and non-name fields during name-only reviews.
- Review reconciliation requires nonempty, globally unique normalized names.
- Rebuild the derived tables after source changes, including name-only edits,
  because `color_oklab` stores its own copy of each name.

## Lookup API

**Current migration blocker:** the assets now live in `src/engine/colors`, but
[named-color-lookup.ts](named-color-lookup.ts) still imports
`../engine/index.ts`, which does not resolve from this location. It needs to
import `../index.ts` before the following usage can run. Maintenance scripts
and color tests also still reference the former `src/colors` location. These
READMEs document the issue; they do not change those code paths.

After correcting that import, use a separate import from a repository-root
script (the lookup is not exported by the engine barrel):

```ts
import {
  findNearestNamedColor,
  findNearestNamedColors,
} from './src/engine/colors/named-color-lookup.ts';

const black = findNearestNamedColor('#000');
console.log(black);

const matches = findNearestNamedColors(['#000', '#7F8C65']);
console.log(matches);
```

`findNearestNamedColor(input)` accepts a hex string and returns:

```ts
interface NamedColorMatch {
  name: string;
  hex: string;
  distance: number;
}
```

An exact catalog hex returns distance `0`. Otherwise the lookup uses expanding
R-tree bounds and Euclidean OKLab distance, not CIEDE2000 or CAM16 distance.
Distance is in native OKLab units, not a percentage or a normalized confidence
score. The returned `hex` is the catalog color, not necessarily the input.

`findNearestNamedColors(inputs)` returns one result per input in input order,
adding `queryHex` with the normalized query. It avoids repeated work within
the batch. The module also maintains a bounded 4,096-entry cache across calls.
Single-result objects are cached and shared; treat them as read-only.
Invalid hex values throw, as does an empty or incomplete spatial index when
no qualifying candidate is found.

## Integration

The lookup imports `bun:sqlite`, opens the database read-only at module load,
and imports the SQLite asset using `with { type: 'file' }`. It requires Bun and
an asset-aware build/deployment that keeps the database available at the
resolved path. It is not directly usable in Node.js or a browser bundle.
For those environments, expose a server lookup endpoint or implement a
compatible adapter around the catalog rather than bundling `bun:sqlite`.

This is a **hex-to-nearest-name** API, not a name parser. It also differs from
the palette engine's `catalog` option: that option accepts an in-memory record
or array and performs joint palette assignment in the generation space.
It does not automatically load this database. Use individual nearest-name
lookups for labels; use `catalog` when coordinated palette matching is needed.

## Review and Rebuild Workflow

**Before running maintenance:** update references to the old `src/colors`
directory in the scripts and color tests to `src/engine/colors`, including
temporary-file paths. Otherwise these commands target the wrong location or
fail. Back up both source files before applying changes.

The repository's staged review workflow, once those paths are corrected:

```sh
bun run color-names:split --shard-size=250
bun run color-names:merge --run=<review-run-directory>
bun run color-names:merge --run=<review-run-directory> --write
```

The splitter validates source agreement and creates review artifacts under
`data/color-name-review` by default. Complete the generated proposal CSVs
according to each run's instructions before merging. The merge without
`--write` validates coverage, source freshness, and name uniqueness and creates
`staged-colors.csv`; it leaves the canonical CSV and database unchanged.
Applying with `--write` backs up the sources, updates both catalogs, and
rebuilds the search index. Retain the reported backups until verification passes.

For an index-only rebuild and verification, after correcting the paths:

```sh
bun run color-names:index
bun test tests/colors
```

The index command requires an existing populated `colors` source table.
There is no CSV-to-database bootstrap command in this workflow. Historical
pilot/batch and repair scripts in [scripts/](../../../scripts/) contain their
own rename rules; do not run them as an initialization step.

## Provenance and Distribution

The catalog's size and color names do not establish its source or license.
No dataset-specific provenance or redistribution terms are recorded in this
folder. Confirm the original sources, attribution requirements, and licensing
before distributing these assets with other projects. This README does not
grant redistribution rights or assert that the names are standardized.

For the independent numerical API, see [the engine README](../README.md).