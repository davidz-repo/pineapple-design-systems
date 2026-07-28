import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver; Radix UI ScrollArea requires it
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Node.js v22+ ships a built-in `localStorage` backed by an in-memory store
// that lacks `clear()`. Replace it with a full in-memory implementation so
// tests can call `localStorage.clear()` between runs.
//
// Known gotcha: this shim replaces `globalThis.localStorage`, so a `<script>`
// executing inside jsdom reads a *different* store (jsdom's own window
// storage) and will not see anything written through this object.
const _storage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => _storage[k] ?? null,
  setItem: (k: string, v: string) => { _storage[k] = v; },
  removeItem: (k: string) => { delete _storage[k]; },
  clear: () => { Object.keys(_storage).forEach(k => delete _storage[k]); },
  key: (i: number) => Object.keys(_storage)[i] ?? null,
  get length() { return Object.keys(_storage).length; },
};

afterEach(() => {
  cleanup();
});
