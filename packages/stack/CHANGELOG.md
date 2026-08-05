# @pineappleui/stack

## 0.1.2

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

## 0.1.1

### Patch Changes

- [#31](https://github.com/davidz-repo/pineapple-design-systems/pull/31) [`2c13057`](https://github.com/davidz-repo/pineapple-design-systems/commit/2c130572ec02742ff29a3150ad27eef64c5f3f67) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Both packages gain the ref-forwarding test they shipped without.

  Nothing about either component changes — the published `dist/` is byte-identical, and test
  files never travel in the tarball. What changes is that the forwarding is now pinned: the ref
  rides in `...rest`, past the destructured `direction` (and `wrap`), onto the `<div>` Radix's
  `Flex` renders, and a refactor that stopped spreading `rest` would still render, still lay out,
  and pass every class-name assertion these files already had while dropping every consumer's
  `ref` on the floor.

  `scripts/check-ref-tests.mjs` now fails the build for any package whose props carry a `ref` and
  whose tests do not check that the ref arrives, so this gap cannot reopen quietly in a twelfth
  package.

## 0.1.0

### Minor Changes

- [#16](https://github.com/davidz-repo/pineapple-design-systems/pull/16) [`2eaeda7`](https://github.com/davidz-repo/pineapple-design-systems/commit/2eaeda75f6af07a98e7980b0f1ff05e8d0ebea16) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First release of `@pineappleui/box`, `@pineappleui/stack` and `@pineappleui/inline` — the three
  layout wrappers over `@radix-ui/themes`. `Box` passes Radix's `Box` straight through, type and
  all. `Stack` is a `Flex` with `direction` narrowed to the column variants and defaulted to
  `column`; `Inline` is a `Flex` narrowed to the row variants, defaulted to `row`, and defaulted to
  `wrap` so a long row reflows instead of overflowing. Narrowing the prop is what keeps each name
  matching its behaviour: asking a `Stack` to lay out horizontally is a type error rather than a
  silent re-layout.

  None of the three ships a runtime dependency. React, React DOM and `@radix-ui/themes` are peers in
  all three — declared, and left external to the bundle — so the consumer supplies one copy of each,
  and Radix's own stylesheet is what the spacing and alignment props resolve against. Ported from
  the private monorepo they grew in, with the scope renamed and the publish contract (public access,
  MIT licence, `dist/`-rooted entry points) applied.
