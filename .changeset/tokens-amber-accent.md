---
"@pineappleui/tokens": minor
---

`ACCENT_COLORS` gains `amber`, bringing the vocabulary to seven.

Additive and appended: `amber` goes on the end, and the six that were already there keep both
their membership and their positions. The array is picker order in consuming UIs, so inserting a
member — even in a "nicer" place — reshuffles a control every one of them already renders.
`AccentColor` widens to match, which is the only reason this is a minor rather than a patch: a
`switch` that was exhaustive over six accents is not exhaustive over seven.

It joins because `@pineappleui/theme` now defaults to it, and the reference site's palette is
built on the amber scale. Nothing else moves — the list still carries no implication about which
accent is the default, which is why the default lives in the theme package as a literal rather
than as a position in this array.

One knock-on worth naming, because it is a build failure rather than a behaviour change:
`scripts/check-token-drift.mjs` fails any file outside this package that names two or more
members of this list, and adding a member can therefore fail a file that nobody edited. It did
here, once: `packages/icons/src/Icon.stories.tsx` offered `var(--indigo-11)` and
`var(--amber-11)` in the same row of Radix scale steps, which was one accent name until `amber`
became the second. That row is a set of distinguishable hues rather than a copy of this list, so
the fix was to pick a step outside it (`blue`).
