# @pineappleui/box

## 0.1.1

### Patch Changes

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
