# @pineappleui/text

## 0.1.0

### Minor Changes

- [#18](https://github.com/davidz-repo/pineapple-design-systems/pull/18) [`c5bdcd6`](https://github.com/davidz-repo/pineapple-design-systems/commit/c5bdcd6eae0c55fec346b92a7e33f98ff47675e6) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First release of `@pineappleui/text` and `@pineappleui/heading` — the two typography wrappers over
  `@radix-ui/themes`. `Text` passes Radix's `Text` straight through, type and all. `Heading` adds one
  behaviour: each semantic level gets a default step on the type scale, so `<Heading as="h3">` renders
  at an h3's size instead of at the same size as every other level. Radix's `as` sets the tag only,
  which is why an unstyled `h1`–`h6` all look alike; an explicit `size` still wins, and a bare
  `<Heading>` with no level to map from keeps Radix's own default.

  Neither ships a runtime dependency. React, React DOM and `@radix-ui/themes` are peers in both —
  declared, and left external to the bundle — so the consumer supplies one copy of each, and Radix's
  own stylesheet is what the type-scale props resolve against. `@pineappleui/tokens` is a
  devDependency of both, used only by the playground stories to build their accent-colour control
  from the real list; it is not part of either published package. Ported from the private monorepo
  they grew in, with the scope renamed and the publish contract (public access, MIT licence,
  `dist/`-rooted entry points) applied.
