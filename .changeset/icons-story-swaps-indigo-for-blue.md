---
"@pineappleui/icons": patch
---

The Icon playground story offers `var(--blue-11)` where it offered `var(--indigo-11)`.

Nothing about `Icon` changes and the published `dist/` is byte-identical. The row is a set of
Radix scale steps chosen to be distinguishable from each other — it is not, and was never, a copy
of `ACCENT_COLORS`.

It became one by accident. `@pineappleui/tokens` added `amber` to that list, and this file already
offered `var(--amber-11)` alongside `var(--indigo-11)` — so a row naming one accent started naming
two, and `scripts/check-token-drift.mjs` correctly failed a file nobody had edited. That guard is
doing its job: two members of a list it owns, in a file outside it, is how a hand-typed copy of
that list begins.

`blue` is outside `ACCENT_COLORS`, like `red`, `green` and `gray` already in the row, so the set
is back to naming at most one accent and reads the same on screen.
