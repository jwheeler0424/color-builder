import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, expect } from 'bun:test';

declare module 'bun:test' {
  interface Matchers<T> extends TestingLibraryMatchers<T, void> {}
}

GlobalRegistrator.register({ url: 'http://localhost:5173' });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const { cleanup } = await import('@testing-library/react');
const { default: _default, ...matchers } = await import('@testing-library/jest-dom/matchers');
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
