# @pineappleui/card

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
