# @pineappleui/icons

## 0.2.1

### Patch Changes

- [#45](https://github.com/davidz-repo/pineapple-design-systems/pull/45) [`7be2cde`](https://github.com/davidz-repo/pineapple-design-systems/commit/7be2cde73c70402cadd8fbe6ca59916c3af6c698) Thanks [@davidz-repo](https://github.com/davidz-repo)! - The Icon playground story offers `var(--blue-11)` where it offered `var(--indigo-11)`.

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

## 0.2.0

### Minor Changes

- [#13](https://github.com/davidz-repo/pineapple-design-systems/pull/13) [`91cffe5`](https://github.com/davidz-repo/pineapple-design-systems/commit/91cffe5c2e0473248021f6113d1fc33de42bdd03) Thanks [@davidz-repo](https://github.com/davidz-repo)! - `@pineappleui/icons` now exports `ICON_NAMES` and `ICON_SIZES` — the glyph names and the size
  tokens as runtime values (`readonly IconName[]` / `readonly IconSize[]`), for consumers building
  an icon picker, a gallery or a `<select>`. A type cannot be iterated, so `IconName` alone left
  every such UI hand-typing the set. Both are derived from the internal `ICONS` and `SIZES` maps,
  which stay the single definition site: adding a glyph adds it to everything built on them, with
  no second list to keep in step. The package's own story gallery now maps over the exports rather
  than the private copies it used to carry.

## 0.1.0

### Minor Changes

- [#10](https://github.com/davidz-repo/pineapple-design-systems/pull/10) [`98ed0cf`](https://github.com/davidz-repo/pineapple-design-systems/commit/98ed0cf7c3f96c283bac389a8e9dcbc27e748a96) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First public release of `@pineappleui/use-local-storage`, `@pineappleui/live-region` and
  `@pineappleui/icons` — the three Phase 1 packages, none of which depends on another `@pineappleui`
  package. `use-local-storage` is the hook that syncs a piece of state to `localStorage`;
  `live-region` is the audited `aria-live` announcement wrapper; `icons` is the Lucide wrapper with
  design-system size tokens and decorative-by-default a11y, and ships `lucide-react` as its one
  runtime dependency. React is a peer everywhere. Ported from the private monorepo they grew in, with
  the scope renamed and the publish contract (public access, MIT licence, `dist/`-rooted entry points)
  applied.
