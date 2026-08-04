# @pineappleui/tokens

## 0.2.0

### Minor Changes

- [#45](https://github.com/davidz-repo/pineapple-design-systems/pull/45) [`7be2cde`](https://github.com/davidz-repo/pineapple-design-systems/commit/7be2cde73c70402cadd8fbe6ca59916c3af6c698) Thanks [@davidz-repo](https://github.com/davidz-repo)! - `ACCENT_COLORS` gains `amber`, bringing the vocabulary to seven.

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

## 0.1.1

### Patch Changes

- [#8](https://github.com/davidz-repo/pineapple-design-systems/pull/8) [`e15e753`](https://github.com/davidz-repo/pineapple-design-systems/commit/e15e7534b43fd7251da31f73b57116ff09f01a2e) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Ship `LICENSE` and `README.md` inside the published tarball.

  `0.1.0` published with neither. npm reads both only from the package directory, so the
  repo-root copies never travelled: the package page rendered as a bare file list, and the
  MIT grant was absent from the artefact that actually gets installed — which npm surfaces
  to consumers' licence scanners as "proprietary".

## 0.1.0

### Minor Changes

- [#1](https://github.com/davidz-repo/pineapple-design-systems/pull/1) [`46e8996`](https://github.com/davidz-repo/pineapple-design-systems/commit/46e89964094eb5bc81709070945e7fb4054e3ffe) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First public release of `@pineappleui/tokens`: the accent-color list and the theme-preference types, as pure data with no React, Radix or DOM dependency. `ACCENT_COLORS` is ordered to match the upstream monorepo and ends with `bronze`, which remains the default accent.
