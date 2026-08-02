import type { ReactNode } from 'react';

import { createContext, use } from 'react';

import { ACCENT_COLORS } from '@pineappleui/tokens';
import { useLocalStorage } from '@pineappleui/use-local-storage';

import type { AccentColor, AppearanceSetting, ThemePreferences } from '@pineappleui/tokens';

const STORAGE_KEY = 'pineappleui.theme.v1';

// Keep `accentColor` in sync with the first-paint script's fallback accent in
// `../getFoucScript.ts` — a mismatch shows the wrong accent for one paint, and
// `getFoucScript.test.ts` is what fails when they disagree.
const DEFAULT_PREFERENCES: ThemePreferences = {
  appearance: 'system',
  accentColor: 'bronze',
};

interface ThemePreferencesContextValue {
  appearance: AppearanceSetting;
  accentColor: AccentColor;
  setAppearance: (appearance: AppearanceSetting) => void;
  setAccentColor: (accentColor: AccentColor) => void;
}

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null);

function isValidPreferences(value: unknown): value is ThemePreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  const validAppearance = v.appearance === 'light' || v.appearance === 'dark' || v.appearance === 'system';
  const validAccent = typeof v.accentColor === 'string'
    && (ACCENT_COLORS as readonly string[]).includes(v.accentColor);
  return validAppearance && validAccent;
}

export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<ThemePreferences>(
    STORAGE_KEY,
    DEFAULT_PREFERENCES,
  );

  // If the stored value is somehow invalid (e.g. from a previous schema), fall back to defaults.
  const prefs = isValidPreferences(stored) ? stored : DEFAULT_PREFERENCES;

  function setAppearance(appearance: AppearanceSetting) {
    setStored({ ...prefs, appearance });
  }

  function setAccentColor(accentColor: AccentColor) {
    setStored({ ...prefs, accentColor });
  }

  return (
    <ThemePreferencesContext
      value={{
        appearance: prefs.appearance,
        accentColor: prefs.accentColor,
        setAppearance,
        setAccentColor,
      }}
    >
      {children}
    </ThemePreferencesContext>
  );
}

// Both ThemePreferencesProvider (component) and useThemePreferences (hook) live in
// this file intentionally — the hook reads from the context this file owns.
// eslint-disable-next-line react-refresh/only-export-components
export function useThemePreferences(): ThemePreferencesContextValue {
  const ctx = use(ThemePreferencesContext);
  if (ctx === null) {
    throw new Error(
      'useThemePreferences must be called inside <ThemePreferencesProvider>.',
    );
  }
  return ctx;
}
