import { useSyncExternalStore } from 'react';

import { createCmykConverter, type CmykConverter, type RenderingIntent } from '@/lib/engine/icc';
import { setCmykConverter } from '@/lib/tools/cmyk-profile';

interface ProfileState {
  converter: CmykConverter | null;
  loading: boolean;
  error: string | null;
  intent: RenderingIntent;
}

let state: ProfileState = { converter: null, loading: false, error: null, intent: 'relative' };
const listeners = new Set<() => void>();
let requestId = 0;

function update(next: ProfileState): void {
  state = next;
  setCmykConverter(next.converter);
  listeners.forEach((listener) => listener());
}

export async function loadCmykProfile(
  file: File,
  intent: RenderingIntent = 'relative',
): Promise<void> {
  const request = ++requestId;
  update({ ...state, loading: true, error: null });
  try {
    if (file.size < 128 || file.size > 16 * 1024 * 1024)
      throw new Error('Choose a CMYK ICC profile between 128 bytes and 16 MB.');
    const bytes = await file.arrayBuffer();
    const converter = await createCmykConverter(bytes, {
      intent,
      blackPointCompensation: true,
      locateWasm: () => '/lcms.wasm',
    });
    if (request !== requestId) {
      converter.dispose?.();
      return;
    }
    state.converter?.dispose?.();
    update({ converter, loading: false, error: null, intent });
  } catch (error) {
    if (request !== requestId) return;
    update({
      ...state,
      loading: false,
      error: error instanceof Error ? error.message : 'Could not load this profile.',
    });
  }
}

export function clearCmykProfile(): void {
  requestId++;
  state.converter?.dispose?.();
  update({ converter: null, loading: false, error: null, intent: 'relative' });
}

export function useCmykProfile(): ProfileState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => state,
  );
}
