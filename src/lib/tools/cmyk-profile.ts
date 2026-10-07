import type { CmykConverter } from '@/lib/engine/icc';

let converter: CmykConverter | null = null;

export function getCmykConverter(): CmykConverter | null {
  return converter;
}

export function setCmykConverter(value: CmykConverter | null): void {
  converter = value;
}
