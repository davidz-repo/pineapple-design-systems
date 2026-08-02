# @pineappleui/theme

## 0.1.0

### Minor Changes

- [#25](https://github.com/davidz-repo/pineapple-design-systems/pull/25) [`922a504`](https://github.com/davidz-repo/pineapple-design-systems/commit/922a5046cae27debc190f578d952f120b9458ea2) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First release of `@pineappleui/theme` — the theme layer every other package renders inside.
  `ThemePreferencesProvider` holds appearance and accent as one record and persists it;
  `DesignSystemProvider` renders Radix Themes' `<Theme>` from that record, resolving "follow the
  OS" against `prefers-color-scheme`; `useThemePreferences` reads and sets it; and `getFoucScript`
  returns the first-paint snippet as a string, for an inline `<script>` that paints the stored
  theme before any module loads instead of painting the default and snapping to it.

  It also ships a stylesheet at `@pineappleui/theme/styles.css`. That one import pulls in Radix
  Themes' own stylesheet and the self-hosted Geist font, so a consumer imports one stylesheet
  rather than three, and the package is `sideEffects: ["**/*.css"]` so no bundler tree-shakes it
  away.

  This is the first package in the scope with runtime dependencies beyond `@pineappleui/icons`'
  Lucide. `@pineappleui/tokens` and `@pineappleui/use-local-storage` are `dependencies` — the
  accent vocabulary and the preference types come from the first, the persistence from the second
  — and both stay external to the bundle, so the consumer installs one copy of each rather than
  receiving a second inlined here. `@fontsource-variable/geist` is a `dependency` too, and it is
  the one no JavaScript import names: the stylesheet `@import`s it, ships verbatim, and is
  resolved by the _consumer's_ bundler against the consumer's own tree. `react`, `react-dom` and
  `@radix-ui/themes` are peers, as everywhere else in the scope.

  Ported from the private monorepo it grew in, with the scope renamed and the publish contract
  (public access, MIT licence, `dist/`-rooted entry points) applied. One difference worth naming:
  the first-paint script's accent list and its accent-to-gray map are serialized from
  `@pineappleui/tokens` and from Radix's own `getMatchingGrayColor` rather than hand-typed, so an
  accent added to the tokens package reaches first paint with no second edit to remember.

### Patch Changes

- Updated dependencies [[`d0aac15`](https://github.com/davidz-repo/pineapple-design-systems/commit/d0aac15294e0f6bc8c101d5005e21c948f58ced4)]:
  - @pineappleui/use-local-storage@0.2.0
