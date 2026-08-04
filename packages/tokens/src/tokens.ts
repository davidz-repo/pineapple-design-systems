// Array order is accent-picker order in consuming UIs, and matches the upstream
// monorepo — it carries no implication about which accent is the default.
// `amber` is the default accent despite sitting last: it pairs with the `sand`
// gray, and it is what the reference site's pineapple palette is built on. It
// superseded `bronze`, which superseded `violet`, which superseded `teal`.
//
// Appended rather than inserted: the position is picker order, and moving an
// existing member shuffles every consuming picker for no reason. Deriving the
// default from a position in this list is the thing to keep NOT doing — see
// `DEFAULT_ACCENT` in @pineappleui/theme.
export const ACCENT_COLORS = ['indigo', 'violet', 'teal', 'orange', 'crimson', 'bronze', 'amber'] as const;
export type AccentColor = typeof ACCENT_COLORS[number];

// Tri-state: 'system' means "match the OS preference via matchMedia".
// Resolving 'system' → 'light' | 'dark' is the consuming theme provider's job;
// this package is pure data and does not read `matchMedia` itself.
export type AppearanceSetting = 'light' | 'dark' | 'system';

export interface ThemePreferences {
  appearance: AppearanceSetting;
  accentColor: AccentColor;
}
