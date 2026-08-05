// Public surface of @pineappleui/theme.
// Provider tree + theme-preferences hook + first-paint snippet helper.
// The global stylesheet ships as a subpath import: `@pineappleui/theme/styles.css`.
//
// THEME_STORAGE_KEY is the storage key as a value, for a consumer who reads the
// stored record themselves or migrates it to a key of their own — the rest of
// `preferences.ts` (the default record, the default accent) stays internal.

export { getFoucScript } from './getFoucScript';
export { STORAGE_KEY as THEME_STORAGE_KEY } from './preferences';
export { DesignSystemProvider } from './providers/DesignSystemProvider';
export {
  ThemePreferencesProvider,
  useThemePreferences,
} from './providers/ThemePreferencesProvider';
// The scale both painting surfaces have to agree on, and Radix's own step
// union behind it — a consumer pinning one needs the type to hold it.
export { DEFAULT_SCALING } from './scaling';
export type { Scaling } from './scaling';
