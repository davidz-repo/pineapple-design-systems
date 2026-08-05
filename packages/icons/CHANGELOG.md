# @pineappleui/icons

## 0.2.2

### Patch Changes

- [#52](https://github.com/davidz-repo/pineapple-design-systems/pull/52) [`55efac8`](https://github.com/davidz-repo/pineapple-design-systems/commit/55efac82d77da5dc33b50fa727d0273cc05dd460) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Describe every prop these packages document, in the packages' own words.

  The built JS is unaffected for all eleven — JSDoc reaches nothing at runtime. What changes is
  `dist/index.d.ts`, which is the file your editor reads: hovering `variant` on a `<Button>` used
  to give you the union and stop there.

  Radix Themes ships JSDoc on its shared layout props and on `Box`/`Flex`, and none at all on the
  per-component prop defs behind `Button`, `Text`, `Heading`, `Card`, `Badge`, `IconButton` and
  `TextArea`. Those seven inherit their whole prop surface as `ComponentPropsWithRef<typeof
RadixX>`, so there was nowhere to put a sentence: 63 of the 68 undescribed props in the docs
  site's generated tables were theirs, and on eight of the sixteen package pages — nine tables,
  Button and Text among them — the Description column was dropped altogether because every cell
  in it was empty.

  Each of the seven now intersects a block that re-states its props with the **same** type read
  back off the Radix props (`variant?: RadixButtonProps['variant']`), purely to hang a
  description on each. Nothing is narrowed, renamed or given a default: the checker resolves the
  identical type, Radix's own declared defaults still come through, and a prop Radix adds later
  still arrives through the intersection without being listed. `icons`, `inline`, `live-region`
  and `stack` already declared their props and simply gained the five comments they were missing.

  `IconProps` becomes a type alias over the same intersection, having been an `interface … extends
Omit<LucideProps, …>`. The two are not interchangeable for a restated prop: an interface member
  REPLACES what it inherits instead of intersecting with it, so `absoluteStrokeWidth?:
LucideProps['absoluteStrokeWidth']` — an indexed access on an optional property, and therefore
  `boolean | undefined` — was `error TS2430` against Lucide's `absoluteStrokeWidth?: boolean` for
  any consumer compiling with `exactOptionalPropertyTypes`, and a silently widened type for
  anyone with `skipLibCheck: true`. The intersection AND-s optionality across its constituents,
  so Lucide's own declaration survives beside the description and `absoluteStrokeWidth: undefined`
  is rejected again. Everything else about the type is unchanged: same props, same types, same
  `Omit`.

  `text-field` is deliberately left as it was. It re-exports Radix's compound namespace whole so
  that `TextField.RootProps` and `TextField.SlotProps` keep resolving for consumers, which means
  it has no props type of its own to describe them in — and inventing one would break the export
  this package exists to pass through.

- [#48](https://github.com/davidz-repo/pineapple-design-systems/pull/48) [`32086f5`](https://github.com/davidz-repo/pineapple-design-systems/commit/32086f5133477b70ad3ce94c524bc5d3ebb88551) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Point each README at the generated props table instead of denying one exists.

  No code changes — the published `dist/` is byte-identical for all ten. What changes is one
  paragraph in each README, which is a file npm renders on the package page.

  Each of them said "The prop set is deliberately not reproduced here" (icons: "The glyph list
  is"), and the docs site now reproduces it: every package page generates a full props table from
  the package's own TypeScript types, one section below the README it is quoting. On the site the
  two paragraphs sit a screen apart contradicting each other, and icons' Props table prints all
  twelve glyph names as `Icon.name`'s type.

  The reason behind the sentence still holds and is kept: the type is authoritative, your editor
  completes from it, and a hand-written second copy in prose is a copy that goes stale without
  failing. What is dropped is the claim that no copy exists anywhere. The generated one cannot go
  stale — it is built from the same types on every deploy — so the paragraph now names it and
  links the page.

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
