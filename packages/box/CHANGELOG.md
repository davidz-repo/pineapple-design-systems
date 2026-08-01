# @pineappleui/box

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
