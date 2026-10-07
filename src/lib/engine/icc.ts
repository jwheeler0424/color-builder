/**
 * ICC-profile CMYK through Little-CMS (lcms-wasm). The input is the color's CIELAB (D50), which
 * is the ICC profile connection space, so wide-gamut colors reach the profile unclipped and the
 * profile's own rendering intent does the gamut mapping into ink.
 */
import type { Lcms } from 'lcms-wasm';

import type { Lab } from './spaces/types.ts';

export type RenderingIntent = 'perceptual' | 'relative' | 'saturation' | 'absolute';

export interface CmykConverter {
  /** The profile's description, e.g. "Coated FOGRA39 (ISO 12647-2:2004)". */
  name: string;
  /** C, M, Y, K in percent (0..100). */
  toCmyk(lab: Lab): [number, number, number, number];
  /** The CIELAB (D50) the profile prints for C, M, Y, K in percent. */
  toLab(cmyk: readonly [number, number, number, number]): Lab;
  dispose?(): void;
}

export interface CmykOptions {
  /** Default "relative" (relative colorimetric), the usual choice for spot colors. */
  intent?: RenderingIntent;
  /** Default true. */
  blackPointCompensation?: boolean;
  /** Where to fetch lcms.wasm from when the bundler moves it. */
  locateWasm?: (file: string) => string;
}

let runtime: Promise<Lcms> | undefined;

export async function createCmykConverter(
  profile: ArrayBuffer | Uint8Array,
  options: CmykOptions = {},
): Promise<CmykConverter> {
  const [{ instantiate }, C] = await Promise.all([
    import('lcms-wasm'),
    import('lcms-wasm/lib/constants.js'),
  ]);
  const { locateWasm } = options;
  runtime ??= instantiate(
    locateWasm ? { locateFile: (file) => locateWasm(file) } : undefined,
  ).catch((error: unknown) => {
    runtime = undefined;
    throw error;
  });
  const lcms = await runtime;

  const bytes = profile instanceof Uint8Array ? profile : new Uint8Array(profile);
  const handle = lcms.cmsOpenProfileFromMem(bytes, bytes.byteLength);
  if (!handle) throw new Error('This file is not a readable ICC profile.');
  const colorSpace = lcms.cmsGetColorSpaceASCII(handle).trim();
  if (colorSpace !== 'CMYK') {
    lcms.cmsCloseProfile(handle);
    throw new Error(`Expected a CMYK output profile, got a ${colorSpace} profile.`);
  }

  const intents: Record<RenderingIntent, number> = {
    perceptual: C.INTENT_PERCEPTUAL,
    relative: C.INTENT_RELATIVE_COLORIMETRIC,
    saturation: C.INTENT_SATURATION,
    absolute: C.INTENT_ABSOLUTE_COLORIMETRIC,
  };
  // The wrapper only marshals 32-bit floats correctly, so use FLT rather than DBL formats.
  const float = (space: number, channels: number) =>
    C.FLOAT_SH(1) | C.COLORSPACE_SH(space) | C.CHANNELS_SH(channels) | C.BYTES_SH(4);
  const lab = lcms.cmsCreateLab4Profile(null);
  const intent = intents[options.intent ?? 'relative'];
  const flags = (options.blackPointCompensation ?? true) ? C.cmsFLAGS_BLACKPOINTCOMPENSATION : 0;

  const transform = lcms.cmsCreateTransform(
    lab,
    float(C.PT_Lab, 3),
    handle,
    float(C.PT_CMYK, 4),
    intent,
    flags,
  );
  const inverse = lcms.cmsCreateTransform(
    handle,
    float(C.PT_CMYK, 4),
    lab,
    float(C.PT_Lab, 3),
    intent,
    flags,
  );
  if (!transform) {
    if (inverse) lcms.cmsDeleteTransform(inverse);
    lcms.cmsCloseProfile(lab);
    lcms.cmsCloseProfile(handle);
    throw new Error('Little-CMS could not build a Lab → CMYK transform for this profile.');
  }

  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error('This CMYK converter has been disposed.');
  };

  return {
    name: lcms.cmsGetProfileInfoASCII(handle, C.cmsInfoDescription, 'en', 'US') || 'CMYK profile',
    toCmyk({ L, a, b }) {
      assertActive();
      if (![L, a, b].every(Number.isFinite)) throw new Error('Lab coordinates must be finite.');
      const [c, m, y, k] = lcms.cmsDoTransform(transform, new Float32Array([L, a, b]), 1);
      return [c!, m!, y!, k!];
    },
    toLab(cmyk) {
      assertActive();
      if (
        cmyk.length !== 4 ||
        !cmyk.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
      )
        throw new Error('CMYK ink values must be between 0 and 100.');
      if (!inverse) throw new Error('This CMYK profile cannot convert ink values back to color.');
      const [L, a, b] = lcms.cmsDoTransform(inverse, new Float32Array(cmyk), 1);
      return { L: L!, a: a!, b: b! };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lcms.cmsDeleteTransform(transform);
      if (inverse) lcms.cmsDeleteTransform(inverse);
      lcms.cmsCloseProfile(lab);
      lcms.cmsCloseProfile(handle);
    },
  };
}
