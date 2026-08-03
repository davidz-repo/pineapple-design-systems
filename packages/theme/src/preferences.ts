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
// So neither file writes either value out. The module itself is not published,
// and one value in it is: `index.ts` re-exports `STORAGE_KEY` as
// `THEME_STORAGE_KEY`, so a consumer overriding the key on both surfaces has
// the default to compare against rather than a string to copy.
// `DEFAULT_PREFERENCES` and `DEFAULT_ACCENT` stay internal.

/**
 * The `localStorage` key both surfaces read and write unless told otherwise —
 * `ThemePreferencesProvider`'s `storageKey` prop and `getFoucScript`'s
 * `storageKey` option both default to it. Published as `THEME_STORAGE_KEY`.
 */
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
