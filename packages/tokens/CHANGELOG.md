# @pineappleui/tokens

## 0.1.1

### Patch Changes

- [#8](https://github.com/davidz-repo/pineapple-design-systems/pull/8) [`e15e753`](https://github.com/davidz-repo/pineapple-design-systems/commit/e15e7534b43fd7251da31f73b57116ff09f01a2e) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Ship `LICENSE` and `README.md` inside the published tarball.

  `0.1.0` published with neither. npm reads both only from the package directory, so the
  repo-root copies never travelled: the package page rendered as a bare file list, and the
  MIT grant was absent from the artefact that actually gets installed — which npm surfaces
  to consumers' licence scanners as "proprietary".

## 0.1.0

### Minor Changes

- [#1](https://github.com/davidz-repo/pineapple-design-systems/pull/1) [`46e8996`](https://github.com/davidz-repo/pineapple-design-systems/commit/46e89964094eb5bc81709070945e7fb4054e3ffe) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First public release of `@pineappleui/tokens`: the accent-color list and the theme-preference types, as pure data with no React, Radix or DOM dependency. `ACCENT_COLORS` is ordered to match the upstream monorepo and ends with `bronze`, which remains the default accent.
