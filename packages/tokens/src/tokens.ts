// `bronze` leads the list and is the default accent: it pairs with the `sand`
// gray. It superseded `violet`, which superseded `teal`.
export const ACCENT_COLORS = ['bronze', 'indigo', 'violet', 'teal', 'orange', 'crimson'] as const;
export type AccentColor = typeof ACCENT_COLORS[number];

// Tri-state: 'system' means "match the OS preference via matchMedia".
// Resolving 'system' → 'light' | 'dark' is the consuming theme provider's job;
// this package is pure data and does not read `matchMedia` itself.
export type AppearanceSetting = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  appearance: AppearanceSetting;
  accentColor: AccentColor;
}
