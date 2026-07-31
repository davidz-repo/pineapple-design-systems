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
});
