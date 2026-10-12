import type { CmykConverter } from './icc.ts';

let converter: CmykConverter | null = null;

/** The process-wide CMYK converter shared by pickers and parsers; `null` until a profile loads. */
export function getCmykConverter(): CmykConverter | null {
  return converter;
}

export function setCmykConverter(value: CmykConverter | null): void {
  converter = value;
}
