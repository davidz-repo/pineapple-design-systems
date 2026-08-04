---
"@pineappleui/theme": minor
---

A new default accent, and a way to pin the accent for an app that offers no choice of one.

**The default is now `amber`** (it was `bronze`). This is what a first-time visitor gets and what
the boot script falls back to when storage holds nothing it recognises; both surfaces read the
same constant, so they moved together. A visitor with an accent already stored is unaffected —
their record is still valid and is still honoured, which is the whole point of storing it.

**`DesignSystemProvider` takes an optional `accentColor`, and `getFoucScript` takes a matching
option.** Passing one pins the accent and ignores the stored preference.

This is for the app that ships a single palette and has no accent picker. Removing the picker
alone does not give those apps one theme: every returning visitor keeps rendering whatever accent
they last chose, out of a record they can no longer change, against a palette designed around a
different one. Changing the package default does not reach them either, for the reason above.

They are a **pair, and must be set together to the same value** — the same rule `storageKey`
already has, for the same reason. The script paints at first paint and the provider paints on
hydration, so a pair that disagrees is one frame of the wrong accent followed by a snap, which is
the exact flash the boot script is inlined to prevent, and nothing anywhere reports it. The
whole-attribute-set diff in `getFoucScript.test.ts` now runs with both halves pinned, so a
surface that learns to pin without the other fails there.

A pin covers the accent and nothing else. The stored appearance (light / dark / system) is still
read and still honoured — it is a preference about the reader's environment rather than about the
product's palette — and `setAccentColor` still exists and still writes, it just no longer changes
what is painted.

Passing nothing keeps the previous behaviour exactly, on the stored accent.
