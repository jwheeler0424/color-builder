# Color Engine

Reusable TypeScript color computation for palette generation, gamut mapping,
conversion, accessibility analysis, and theme export. The numerical API is
independent of React and the application UI, and can be used by server APIs,
command-line tools, or browser applications.

[index.ts](index.ts) is the public entry point. This folder is source code, not
a separately published package: the repository's package entry points at the
application server, not the engine. Import the engine explicitly.

## Quick Start

From the repository root, install dependencies with `bun install`. A script at
the repository root can generate a palette as follows:

```ts
import { generateEnginePalette } from './src/engine/index.ts';

const palette = generateEnginePalette({
  baseColor: '#3b82f6',
  harmony: 'complementary',
  count: 5,
});

console.log(palette.map(({ hex, css, isBase }) => ({
  hex,
  display: css.display,
  isBase,
})));
```

Generation is synchronous and returns `EngineColor[]`. The defaults are
CAM16-UCS, sRGB display output, the physical optimal-color solid as the ideal
gamut, and base-matched chroma. Locate the base with `isBase`; do not assume it
is always the first entry, particularly for ramps.

## Palette Configuration

The full contract is `EnginePaletteConfig` in [palette.ts](palette.ts).

| Option                   | Values / meaning                                                                        | Default                       |
| ------------------------ | --------------------------------------------------------------------------------------- | ----------------------------- |
| `baseColor`              | Hex, case-insensitive catalog name, or `{ xyz: [X, Y, Z] }`                             | Required                      |
| `harmony`                | A `HarmonyId` listed below                                                              | Required                      |
| `count`                  | Integer from 1 through 64                                                               | Required                      |
| `space`                  | `cam16`, `oklch`, `cielab`, `hsl`, `hsv`                                                | `cam16`                       |
| `display`                | `srgb`, `p3`, `rec2020`                                                                 | `srgb`                        |
| `ideal`                  | `optimal` (physical solid), or `display` (selected display gamut)                       | `optimal`                     |
| `chroma`                 | `match` requests base chroma; `relative` requests its share of the ideal gamut          | `match`                       |
| `maxLightnessShift`      | Maximum lightness movement for chroma recovery, as a fraction from 0 to 1               | `0`                           |
| `relativeLightnessShift` | CIELAB hue-shifted colors: fraction toward white or black, from -1 to 1, after recovery | `0`                           |
| `cielabHue`              | `linear` uses OKLab harmony hue; `native` uses CIELAB hue                               | `linear`                      |
| `catalog`                | `{ name: hex }` record or array of `{ name, hex }`                                      | None                          |
| `analogousAngle`         | Maximum degrees between analogous neighbors                                             | `30`                          |
| `seed`                   | Seeds lightness jitter for the golden-angle `random` harmony                            | None                          |
| `sampler`                | Custom `HarmonySampler` for `random`                                                    | Built-in golden-angle sampler |
| `matsudaOrientation`     | Matsuda L accent side: `1` or `-1`                                                      | `1`                           |
| `shadeHueShift`          | Designer hue-shift strength for shades, except CIELAB; `0` disables it                  | `1`                           |
| `naturalChroma`          | Natural harmony chroma relative to `display` or `ideal`                                 | `display`                     |

Harmony-specific chroma requests can override the general chroma mode.
Lightness-shift defaults above are engine defaults, not application UI presets.

Available harmony IDs:

```text
analogous             complementary       split-comp
triadic               tetradic            square
monochromatic         shades              double-split
compound              natural             random
matsuda_L             matsuda_Y           matsuda_X
matsuda_T             matsuda_i           matsuda_I
matsuda_N             accented-analogous  pentadic
hexadic
```

Use `HARMONIES` for labels and descriptions, `HARMONY_IDS` for the IDs, and
`getHarmony()` for a rule definition. Rules produce slots; the palette pipeline
then resolves their chroma against the ideal and display gamuts. Shades use
perceptual neighbor-distance spacing rather than simple linear lightness steps.

## Inputs, Units, and Outputs

The shared interchange format is `Vec3`: `[X, Y, Z]` under D65, with relative
luminance `Y` normalized so reference white is 1. It is not an RGB tuple.
Wide-gamut XYZ values need not have every component between 0 and 1.

`Lab` uses `{ L, a, b }`; `Lch` uses `{ l, c, h }`, with hue in degrees.
Lightness ranges are space-specific: OKLab uses 0 to 1, CIELAB and CAM16-UCS
use 0 to 100, and device HSL/HSV use 0 to 1. For HSL/HSV palette results, `c`
means saturation and `l` means lightness/value. CIELAB is D50 internally and
adapts to/from the common D65 XYZ representation.

Each `EngineColor` includes:

| Field                            | Meaning                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `ideal`                          | Color solved in the ideal gamut, in the selected space                              |
| `color`                          | Display-mapped color, in the selected space                                         |
| `xyz`                            | Unrounded D65 XYZ of the display color                                              |
| `hex`                            | Best 8-bit sRGB rendition, including a fallback for wider displays                  |
| `srgb`                           | Unrounded encoded sRGB rendition behind the hex, not byte values                    |
| `css.space`                      | CSS representation of the mapped color; CAM16 is converted to a CSS-supported space |
| `css.display`                    | Unrounded `color(srgb ...)`, `color(display-p3 ...)`, or `color(rec2020 ...)`       |
| `isBase`, `hueOffset`            | Base identity and harmony hue offset                                                |
| `idealLimited`, `displayLimited` | Whether the requested chroma was constrained by each gamut                          |
| `lightnessShift`                 | Applied display-mapping lightness change                                            |
| `match`                          | Optional catalog name, hex, and perceptual distance                                 |

For wide-gamut workflows, preserve `xyz` or `css.display`; converting everything
to `hex` discards wide-gamut color information. Catalog matching attaches metadata
without replacing the generated color. It pins the base to its closest entry
and assigns the remaining colors by minimum total perceptual distance; entries
can be reused when the palette is larger than the catalog.

`baseColor` strings do not parse arbitrary color functions. Use `parseColor()`
and pass its XYZ to preserve non-hex input:

```ts
import { generateEnginePalette, parseColor } from './src/engine/index.ts';

const input = parseColor('oklch(0.65 0.2 250)');
const palette = generateEnginePalette({
  baseColor: { xyz: input.xyz },
  harmony: 'triadic',
  count: 6,
  display: 'p3',
});
```

Parsing supports short/full RGB hex, `rgb()`, `hsl()`, `hsv()`, `oklch()`,
`oklab()`, `lab()`, `cam16ucs()`, and profile-backed `cmyk()` / `device-cmyk()`.
It is not a complete CSS parser: alpha, CSS named colors, `lch()`, and
`color(display-p3 ...)` are not accepted. `cam16ucs()` and `hsv()` are engine
formats, not native CSS syntax. Invalid inputs throw.

## Additional APIs

| Area                  | Public APIs                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Color spaces          | `OKLAB`, `CIELAB`, `CAM16_UCS`, `createCam16Ucs`, `cam16Model`, LCH/Lab/XYZ helpers                          |
| Device conversion     | `hslToRgb`, `hsvToRgb`, `rgbToHsl`, `rgbToHsv`, `encodedToXyz`, `xyzToEncoded`                               |
| Gamut solving         | `maxChroma`, `fitChroma`, `fitToGamut`, `adaptLightness`, `relativeChroma`, interval and containment helpers |
| Perceptual CIELAB hue | `cielabHueFor`, `fitAlongHue`, `maxAlongHue`                                                                 |
| Output                | `formatColor`, `FORMATS`, `bestHex`, `fitHex`, `cssColor`, `gamutReport`, hex helpers                        |
| Accessibility         | `contrastRatio`, `wcagLevel`, `textColor`, `contrastFix`, `apcaContrast`, `apcaLevel`                        |
| Mixing and simulation | `mix` in OKLab/HSL/RGB; `simulateVision` and `VISION_TYPES`                                                  |
| Scales and scoring    | `generateScale`, `SCALE_STEPS` (50 to 950, 11 steps), `scorePalette`                                         |
| Theme construction    | `generateUtilityColors`, `mergeUtilityColors`, `semanticSlotNames`, `deriveThemeTokens`                      |
| Export                | `buildThemeCss`, `buildTailwindV4`, `buildFigmaTokens`, `buildStyleDictionary`, `buildColorStoryHtml`        |
| Image colors          | `extractColors`, `extractHarmonies`                                                                          |
| Presets               | `THEMES`, `GRADIENT_PRESETS`                                                                                 |
| ICC                   | `createCmykConverter`                                                                                        |

Contrast, mixing, scoring, and vision simulation consume XYZ tuples, not hex
strings. Use `hexToXyz()` when needed. WCAG/APCA scores and generated theme
tokens are analysis aids, not automatic accessibility certification; evaluate
actual foreground/background pairs, text sizes, and UI states.

Image extraction accepts decoded RGBA pixel data, such as `ImageData.data`, not
an image URL or encoded file. It uses median cut, skips low-alpha pixels, merges
nearby OKLab colors, and filters low-saturation and extreme-lightness colors;
it can return fewer than the requested count.

### Theme Example

```ts
import {
  buildThemeCss,
  deriveThemeTokens,
  generateEnginePalette,
  generateUtilityColors,
} from './src/engine/index.ts';

const colors = generateEnginePalette({
  baseColor: '#3b82f6',
  harmony: 'analogous',
  count: 5,
}).map((color) => color.hex);

const utility = generateUtilityColors(colors);
const tokens = deriveThemeTokens(colors, utility);
const css = buildThemeCss(tokens);
console.log(css);
```

## Integration and Runtime Boundaries

- Keep [harmony-lightness.ts](../harmony-lightness.ts) when extracting the engine
  into another project: [harmony.ts](harmony.ts) imports this sibling module.
- Use a TypeScript-aware runtime or bundler that supports `.ts` imports, or
  configure a compilation pipeline that rewrites them for JavaScript output.
  Bun is the repository's supported development/test runner.
- The numerical core does not load the named-color database. The Bun-specific
  lookup is a separate import described in [colors/README.md](colors/README.md).
- ICC support dynamically loads `lcms-wasm` only when creating a converter.
  Supply your own CMYK output profile; no profile is bundled. Ink values are
  percentages from 0 to 100, and the converter uses D50 Lab. Browser bundling
  must serve the WASM asset; `locateWasm` can specify its location.
- [runtime/palette-runtime.ts](runtime/palette-runtime.ts) and
  [runtime/palette.worker.ts](runtime/palette.worker.ts) are application browser
  infrastructure, not barrel exports. They include workers, IndexedDB caching,
  WASM asset handling, and UI settings. Server consumers do not need them.
- The physical solid is built lazily and reused in-process. Call `optimalSolid()`
  during server startup to prewarm it. Serialization/loading helpers are also
  exported. `ideal: 'display'` changes chroma semantics; it is not an equivalent
  performance switch.
- Generation is CPU-bound and synchronous. Validate API requests, bound batch
  sizes, and use server workers if concurrent requests must not block the event
  loop. TypeScript types alone do not validate untrusted JSON. Runtime checks
  cover count and selected numeric/options constraints, not the entire schema.

## Layout and Verification

- [spaces/](spaces/): perceptual conversions and color-space adapters.
- [gamuts/](gamuts/): RGB gamuts, physical solid, and slab indexing.
- [solver.ts](solver.ts), [intervals.ts](intervals.ts),
  [separable.ts](separable.ts): gamut-boundary and feasible-interval solving.
- [data/cie.ts](data/cie.ts): spectral data used to construct the physical solid.
- [math/](math/): matrix, polynomial, and assignment utilities.
- [colors/](colors/): named-color datasets and Bun/SQLite lookup.

Run from the repository root:

```sh
bun test tests/engine
bun run typecheck
bun run engine
bun run bench:cam16
bun run bench
```

The benchmark commands overwrite the corresponding reports in
[benchmarks/](../../benchmarks/). They measure local computation, not HTTP latency;
results depend on the runtime, hardware, space, harmony, and request settings.
Regenerate spectral data with `bun run cie:data`; optional solid serialization
is available through `bun run solid:precompute`.