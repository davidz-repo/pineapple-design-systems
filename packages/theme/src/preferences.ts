import type { AccentColor, ThemePreferences } from '@pineappleui/tokens';

// The storage schema, owned in one place.
//
// Two surfaces read and write this record: `ThemePreferencesProvider`, which is
// React, and the string `getFoucScript` emits, which runs before React exists.
// They have to agree on the key and on the fallback accent — a key they disagree
// on is a first paint of the default followed by a snap to the stored theme,
// which is the exact flash the boot script is inlined to prevent, and no type
// can see it because the script's copy lives inside a string.
//
// So neither file writes either value out. This module is internal: `index.ts`
// does not re-export it, so nothing here is a published API.

/** The one `localStorage` key the theme layer reads and writes. */
export const STORAGE_KEY = 'pineappleui.theme.v1';

/** What a first-time visitor gets, and the fallback for a record that no longer parses. */
export const DEFAULT_PREFERENCES: ThemePreferences = {
  appearance: 'system',
  accentColor: 'bronze',
};

// Derived, not re-typed: the boot script needs the accent alone, and reading it
// off the record above is what makes "the script's fallback" and "the provider's
// default" one value rather than two that a test has to keep comparing.
//
// The record's own accent stays a literal on purpose. `ACCENT_COLORS` is a
// vocabulary, not a ranking — `bronze` is the default while sitting LAST in that
// list (see the header of `packages/tokens/src/tokens.ts`), so deriving the
// default from a position in it would re-couple the two things commit 5411352
// separated: reorder the picker and the default silently moves with it.
export const DEFAULT_ACCENT: AccentColor = DEFAULT_PREFERENCES.accentColor;
