// Public surface of @pineappleui/theme.
// Provider tree + theme-preferences hook + first-paint snippet helper.
// The global stylesheet ships as a subpath import: `@pineappleui/theme/styles.css`.

export { getFoucScript } from './getFoucScript';
export { DesignSystemProvider } from './providers/DesignSystemProvider';
export {
  ThemePreferencesProvider,
  useThemePreferences,
} from './providers/ThemePreferencesProvider';
