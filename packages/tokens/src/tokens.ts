// Array order is accent-picker order in consuming UIs, and matches the upstream
// monorepo — it carries no implication about which accent is the default.
// `bronze` is the default accent despite sitting last: it pairs with the `sand`
// gray. It superseded `violet`, which superseded `teal`.
export const ACCENT_COLORS = ['indigo', 'violet', 'teal', 'orange', 'crimson', 'bronze'] as const;
export type AccentColor = typeof ACCENT_COLORS[number];

// Tri-state: 'system' means "match the OS preference via matchMedia".
// Resolving 'system' → 'light' | 'dark' is the consuming theme provider's job;
// this package is pure data and does not read `matchMedia` itself.
export type AppearanceSetting = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  appearance: AppearanceSetting;
  accentColor: AccentColor;
}
