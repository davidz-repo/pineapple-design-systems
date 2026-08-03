---
"@pineappleui/theme": minor
---

The storage key is now part of the public surface, in two additive pieces.

`THEME_STORAGE_KEY` is exported — the `localStorage` key the preference record is persisted
under (`'pineappleui.theme.v1'`), as a value rather than a string to copy. It is what you read
the stored record with, migrate one to or from, or assert against; the default record and the
default accent stay internal.

`ThemePreferencesProvider` now takes an optional `storageKey`, defaulting to that same key. It
exists for the app arriving with theme preferences already stored under a key of its own: adopt
this package without it and the old record is still there, under a key nothing reads, so every
user silently lands back on the default theme.

Override it and you must pass the **same** string to `getFoucScript({ storageKey })`. The two
surfaces read one record — the provider in React, the boot script before React exists — and a
pair that disagrees is not an error anywhere: the script reads nothing, paints the default, and
React snaps to the stored theme one frame later, which is the flash the script is inlined to
prevent. The key also has to be stable for the provider's lifetime; storage is read once, when
the provider mounts, so a key that changes between renders keeps the old key's value and starts
writing it to the new one.

Passing nothing keeps the previous behaviour exactly, on the same key.
