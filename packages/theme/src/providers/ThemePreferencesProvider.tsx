import type { ReactNode } from 'react';

import { createContext, use } from 'react';

import { ACCENT_COLORS } from '@pineappleui/tokens';
import { useLocalStorage } from '@pineappleui/use-local-storage';

import { DEFAULT_PREFERENCES, STORAGE_KEY } from '../preferences';

import type { AccentColor, AppearanceSetting, ThemePreferences } from '@pineappleui/tokens';

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

interface ThemePreferencesProviderProps {
  children: ReactNode;
  /**
   * The `localStorage` key the preference record is persisted under. Defaults
   * to `THEME_STORAGE_KEY`, which is what `getFoucScript` defaults to too.
   *
   * Override BOTH or neither. A consumer who passes a key here must pass the
   * SAME key to `getFoucScript`'s `storageKey` option, or first paint reads a
   * record this provider never wrote: the script paints the default and React
   * snaps to the stored theme one frame later, which is the exact flash the
   * boot script is inlined to prevent. Nothing reports the mismatch — the
   * script's copy of the key lives inside a string.
   *
   * Must be STABLE for the provider's lifetime. `useLocalStorage` reads storage
   * once, in its `useState` initialiser, so a key that changes between renders
   * keeps the value read from the old key and writes it to the new one; there
   * is no re-read. Pass a module constant, not a value derived per render.
   */
  storageKey?: string;
}

export function ThemePreferencesProvider({
  children,
  storageKey = STORAGE_KEY,
}: ThemePreferencesProviderProps) {
  const [stored, setStored] = useLocalStorage<ThemePreferences>(
    storageKey,
    DEFAULT_PREFERENCES,
  );

  // If the stored value is somehow invalid (e.g. from a previous schema), fall back to defaults.
  const prefs = isValidPreferences(stored) ? stored : DEFAULT_PREFERENCES;

  // Both setters write the WHOLE record, so each has to carry the other
  // preference across — and it has to be the other preference as of the WRITE,
  // not as of the render that created the setter. Spreading `prefs` here reads
  // this render's snapshot, so two setter calls in one tick both start from the
  // state before either, and the second silently discards the first. React does
  // not re-render between them, so there is no moment at which the intermediate
  // value could be read back.
  //
  // The updater form of `set` is handed what the previous call produced, which
  // is `useState`'s own guarantee and the reason it has that form. Validity is
  // re-checked inside, because `previous` is the raw stored value — the same
  // thing `prefs` above is derived from, and for the same reason.
  function setAppearance(appearance: AppearanceSetting) {
    setStored(previous => ({
      ...(isValidPreferences(previous) ? previous : DEFAULT_PREFERENCES),
      appearance,
    }));
  }

  function setAccentColor(accentColor: AccentColor) {
    setStored(previous => ({
      ...(isValidPreferences(previous) ? previous : DEFAULT_PREFERENCES),
      accentColor,
    }));
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
