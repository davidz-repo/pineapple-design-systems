# @pineappleui/live-region

## 0.1.1

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
