# @pineappleui/text-area

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

## 0.1.0

### Minor Changes

- [#22](https://github.com/davidz-repo/pineapple-design-systems/pull/22) [`cae2827`](https://github.com/davidz-repo/pineapple-design-systems/commit/cae282777e0477b50f141f3baa344efaf7faf280) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First release of `@pineappleui/text-field` and `@pineappleui/text-area` — the text inputs, and the
  last two wrappers over `@radix-ui/themes` in the port. `TextField` is Radix's compound namespace
  re-exported whole, so `TextField.Root` is the single-line field and `TextField.Slot` an adornment
  rendered inside it; `TextArea` is the multi-line field, passed straight through as
  `ComponentPropsWithRef<typeof TextArea>` in, one element out. Neither adds state, and neither holds
  a value: `value`, `defaultValue` and `onChange` are the native ones. The indirection is the point —
  a change of default, or a swap of the layer underneath, happens in one package instead of at every
  import site.

  Neither ships a runtime dependency. React, React DOM and `@radix-ui/themes` are peers in both —
  declared, and left external to the bundle — so the consumer supplies one copy of each, and Radix's
  own stylesheet is what the size, variant, radius and colour props resolve against. `text-area`'s
  built entry imports `@radix-ui/themes` and `react/jsx-runtime`; `text-field`'s is a single bare
  re-export of `@radix-ui/themes` and names React at all only through the peer declaration, which
  every component package here carries. `@ladle/react` and `@pineappleui/tokens` are devDependencies
  of both — the first for the `Story` type their playground stories import, the second for the
  accent-colour control those stories now build from the real list rather than a hand-typed copy of
  it. Both are story-only, and a story is never part of a published tarball.

  `text-field` gains the ref test it never had upstream, and its slot test now asserts the containment
  its name claims rather than that an `@` rendered somewhere. Both refs are pinned to the element
  Radix types them as — `HTMLInputElement` and `HTMLTextAreaElement` — not to the `<div>` each
  primitive wraps its control in.

  Ported from the private monorepo they grew in, with the scope renamed and the publish contract
  (public access, MIT licence, `dist/`-rooted entry points) applied.
