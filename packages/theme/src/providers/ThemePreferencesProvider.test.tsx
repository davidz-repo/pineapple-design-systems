import type { ReactNode } from 'react';

import { ACCENT_COLORS } from '@pineappleui/tokens';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY } from '../preferences';
import { ThemePreferencesProvider, useThemePreferences } from './ThemePreferencesProvider';

// The provider's own default, written out rather than imported: it is the value
// under test below, and an assertion against the constant it is asserting would
// hold no matter what that constant said.
const DEFAULT_ACCENT = 'bronze';

// Every OTHER accent used here is read off the real list instead of hand-typed.
// Two accent names in one file is the copy `check-token-drift` exists to catch,
// and a second literal would also outlive the accent it names: these two are
// "some accent that is not the default", which is all the tests need them to be.
const [STORED_ACCENT, PICKED_ACCENT] = ACCENT_COLORS.filter(
  accentColor => accentColor !== DEFAULT_ACCENT,
);

function wrapper({ children }: { children: ReactNode }) {
  return <ThemePreferencesProvider>{children}</ThemePreferencesProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe('useThemePreferences', () => {
  it('returns defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    expect(result.current.appearance).toBe('system');
    expect(result.current.accentColor).toBe(DEFAULT_ACCENT);
  });

  it('reads stored preferences from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ appearance: 'dark', accentColor: STORED_ACCENT }),
    );
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    expect(result.current.appearance).toBe('dark');
    expect(result.current.accentColor).toBe(STORED_ACCENT);
  });

  it('falls back to defaults when stored value is invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ appearance: 'banana', accentColor: 'neon' }));
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    expect(result.current.appearance).toBe('system');
    expect(result.current.accentColor).toBe(DEFAULT_ACCENT);
  });

  it('falls back to defaults when stored value is not an object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(42));
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    expect(result.current.appearance).toBe('system');
    expect(result.current.accentColor).toBe(DEFAULT_ACCENT);
  });

  it('writes to localStorage when setAccentColor is called', () => {
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    act(() => {
      result.current.setAccentColor(PICKED_ACCENT);
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      accentColor?: string;
    };
    expect(stored.accentColor).toBe(PICKED_ACCENT);
    expect(result.current.accentColor).toBe(PICKED_ACCENT);
  });

  it('writes to localStorage when setAppearance is called', () => {
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    act(() => {
      result.current.setAppearance('dark');
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      appearance?: string;
    };
    expect(stored.appearance).toBe('dark');
    expect(result.current.appearance).toBe('dark');
  });

  // The two setters write the WHOLE record, so each one has to carry the other
  // preference across. Nothing above notices when one stops: every test that
  // writes starts from EMPTY storage, where the value being dropped already
  // equals the default.
  //
  // One test per setter, because one test pins one direction. Verified by
  // mutation, both ways: `setAccentColor` writing `{ ...DEFAULT_PREFERENCES,
  // accentColor }` fails the first of these two, and `setAppearance` writing
  // `{ ...DEFAULT_PREFERENCES, appearance }` fails the second — and the second
  // mutation was green against every test in this file until the second test
  // was written, which is why the pair is here rather than the accent case
  // alone. It is a user whose accent reverts to bronze the moment they switch
  // to dark: the mirror of the accent case, and just as invisible.
  it('keeps the stored appearance when only the accent is set', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ appearance: 'dark', accentColor: STORED_ACCENT }),
    );
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    act(() => {
      result.current.setAccentColor(PICKED_ACCENT);
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      appearance?: string;
      accentColor?: string;
    };
    expect(stored).toEqual({ appearance: 'dark', accentColor: PICKED_ACCENT });
    expect(result.current.appearance).toBe('dark');
  });

  it('keeps the stored accent when only the appearance is set', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ appearance: 'light', accentColor: STORED_ACCENT }),
    );
    const { result } = renderHook(() => useThemePreferences(), { wrapper });
    act(() => {
      result.current.setAppearance('dark');
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      appearance?: string;
      accentColor?: string;
    };
    expect(stored).toEqual({ appearance: 'dark', accentColor: STORED_ACCENT });
    expect(result.current.accentColor).toBe(STORED_ACCENT);
  });

  // Two setters in ONE tick, which is what a "reset to the light bronze theme"
  // button is. Each setter is created during a render and closes over that
  // render's preference record, so a setter that spreads what it captured
  // resolves against the state BEFORE both calls — the second write overwrites
  // the first, and the first is gone with nothing reporting it. React has not
  // re-rendered in between, so there is no moment at which the intermediate
  // value could be read; the only fix is for the second call to be handed what
  // the first produced, which is the updater form of `set`.
  //
  // Both orders, because each one is a different setter losing the write.
  it('keeps both writes when the appearance is set before the accent, in one tick', () => {
    const { result } = renderHook(() => useThemePreferences(), { wrapper });

    act(() => {
      result.current.setAppearance('dark');
      result.current.setAccentColor(PICKED_ACCENT);
    });

    expect(result.current.appearance).toBe('dark');
    expect(result.current.accentColor).toBe(PICKED_ACCENT);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      appearance: 'dark',
      accentColor: PICKED_ACCENT,
    });
  });

  it('keeps both writes when the accent is set before the appearance, in one tick', () => {
    const { result } = renderHook(() => useThemePreferences(), { wrapper });

    act(() => {
      result.current.setAccentColor(PICKED_ACCENT);
      result.current.setAppearance('dark');
    });

    expect(result.current.appearance).toBe('dark');
    expect(result.current.accentColor).toBe(PICKED_ACCENT);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      appearance: 'dark',
      accentColor: PICKED_ACCENT,
    });
  });

  it('throws when called outside ThemePreferencesProvider', () => {
    // renderHook without a wrapper — no provider in the tree.
    expect(() => renderHook(() => useThemePreferences())).toThrow(
      'useThemePreferences must be called inside <ThemePreferencesProvider>.',
    );
  });
});
