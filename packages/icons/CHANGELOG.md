# @pineappleui/icons

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
