# @pineappleui/button

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

## 0.1.1

### Patch Changes

- [#45](https://github.com/davidz-repo/pineapple-design-systems/pull/45) [`b70a3d1`](https://github.com/davidz-repo/pineapple-design-systems/commit/b70a3d1bbb80e18f8eadd9a82b96958dfc793188) Thanks [@davidz-repo](https://github.com/davidz-repo)! - The Button playground story drops its `color` knob.

  Nothing about `Button` changes — the published component still takes `color`, and the tarball is
  otherwise untouched. This is about what the playground OFFERS, which is a different question from
  what the component supports.

  Both surfaces that render these stories already answer the accent question themselves, at a
  larger scope than one button: the docs site pins a single accent for the whole page, and the
  gallery has a picker in its own toolbar that repaints the entire frame. A third control for the
  same thing, scoped to the one button in the preview, disagreed with both — it tinted the demo
  against a page that was not going to follow it.

  The button in the playground now inherits the theme accent, which is what every other button on
  either surface does. A shared playground link carrying a stale `?color=` degrades on its own:
  the site drops URL args it cannot match to an option.

## 0.1.0

### Minor Changes

- [#20](https://github.com/davidz-repo/pineapple-design-systems/pull/20) [`b037928`](https://github.com/davidz-repo/pineapple-design-systems/commit/b0379282f1d0ce9b5cdf3f9ac59d7263db7a90fb) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First release of `@pineappleui/badge`, `@pineappleui/button`, `@pineappleui/icon-button` and
  `@pineappleui/card` — the action and surface wrappers over `@radix-ui/themes`. Each passes Radix's
  own component straight through, type and all: `Badge` is an inline label, `Button` a real
  `<button>`, `IconButton` the square variant of it for a single glyph, and `Card` a padded surface.
  The indirection is the point — a change of default, or a swap of the layer underneath, happens in
  one package instead of at every import site.

  None of the four ships a runtime dependency. React, React DOM and `@radix-ui/themes` are peers in
  all four — declared, and left external to the bundle — so the consumer supplies one copy of each,
  and Radix's own stylesheet is what the variant, size and colour props resolve against.
  `@ladle/react` is a devDependency of all four, for the `Story` type their playground stories
  import. `@pineappleui/tokens` is a devDependency of `badge`, `button` and `icon-button`, used only
  by those stories to build their accent-colour control from the real list; `card` has no colour
  control and so does not carry it. `@pineappleui/icons` is a devDependency of `icon-button` alone,
  supplying the glyph its stories render — the package itself ships no icons and takes whatever
  child you give it. None of the three dev-only packages is part of any published tarball.

  `icon-button` drops one declaration the private monorepo carries: `@radix-ui/react-icons` was a
  `peerDependency` there, but nothing the package publishes imports it — only a story did, and
  stories are never published. A peer nobody imports is a package npm asks every consumer to install
  for nothing.

  Ported from the private monorepo they grew in, with the scope renamed and the publish contract
  (public access, MIT licence, `dist/`-rooted entry points) applied.
