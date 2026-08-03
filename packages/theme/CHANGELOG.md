# @pineappleui/theme

## 0.2.0

### Minor Changes

- [#27](https://github.com/davidz-repo/pineapple-design-systems/pull/27) [`4a7ac6e`](https://github.com/davidz-repo/pineapple-design-systems/commit/4a7ac6e617553872d53d9739624396aefc549ef3) Thanks [@davidz-repo](https://github.com/davidz-repo)! - The storage key is now part of the public surface, in two additive pieces.

  `THEME_STORAGE_KEY` is exported — the `localStorage` key the preference record is persisted
  under (`'pineappleui.theme.v1'`), as a value rather than a string to copy. It is what you read
  the stored record with, migrate one to or from, or assert against; the default record and the
  default accent stay internal.

  `ThemePreferencesProvider` now takes an optional `storageKey`, defaulting to that same key. It
  exists for the app arriving with theme preferences already stored under a key of its own: adopt
  this package without it and the old record is still there, under a key nothing reads, so every
  user silently lands back on the default theme.

  Override it and you must pass the **same** string to `getFoucScript({ storageKey })`. The two
  surfaces read one record — the provider in React, the boot script before React exists — and a
  pair that disagrees is not an error anywhere: the script reads nothing, paints the default, and
  React snaps to the stored theme one frame later, which is the flash the script is inlined to
  prevent. The key also has to be stable for the provider's lifetime; storage is read once, when
  the provider mounts, so a key that changes between renders keeps the old key's value and starts
  writing it to the new one.

  Passing nothing keeps the previous behaviour exactly, on the same key.

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
