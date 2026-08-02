import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from './index';

describe('@pineappleui/use-local-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the initial value when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('reads a previously stored value on mount', () => {
    localStorage.setItem('seeded', JSON.stringify(42));
    const { result } = renderHook(() => useLocalStorage<number>('seeded', 0));
    expect(result.current[0]).toBe(42);
  });

  it('writes to localStorage when set is called', () => {
    const { result } = renderHook(() => useLocalStorage('persisted', 'a'));
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
    expect(localStorage.getItem('persisted')).toBe(JSON.stringify('b'));
  });

  it('passes the current value to an updater function', () => {
    const { result } = renderHook(() => useLocalStorage('counted', 1));
    act(() => result.current[1](previous => previous + 1));
    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem('counted')).toBe(JSON.stringify(2));
  });

  // The reason the updater form exists. Two `set` calls in ONE tick: the plain
  // form resolves both against the value the render captured, so the second
  // overwrites the first and the first write is simply gone. An updater sees
  // what the call before it produced, which is `useState`'s own guarantee.
  it('composes two updater calls in the same tick', () => {
    const { result } = renderHook(() => useLocalStorage('record', { a: 0, b: 0 }));

    act(() => {
      result.current[1](previous => ({ ...previous, a: 1 }));
      result.current[1](previous => ({ ...previous, b: 2 }));
    });

    expect(result.current[0]).toEqual({ a: 1, b: 2 });
    expect(localStorage.getItem('record')).toBe(JSON.stringify({ a: 1, b: 2 }));
  });
});
