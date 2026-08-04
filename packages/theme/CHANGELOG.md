# @pineappleui/theme

## 0.3.0

### Minor Changes

- [#45](https://github.com/davidz-repo/pineapple-design-systems/pull/45) [`7be2cde`](https://github.com/davidz-repo/pineapple-design-systems/commit/7be2cde73c70402cadd8fbe6ca59916c3af6c698) Thanks [@davidz-repo](https://github.com/davidz-repo)! - A new default accent, and a way to pin the accent for an app that offers no choice of one.

  **The default is now `amber`** (it was `bronze`). This is what a first-time visitor gets and what
  the boot script falls back to when storage holds nothing it recognises; both surfaces read the
  same constant, so they moved together. A visitor with an accent already stored is unaffected —
  their record is still valid and is still honoured, which is the whole point of storing it.

  **`DesignSystemProvider` takes an optional `accentColor`, and `getFoucScript` takes a matching
  option.** Passing one pins the accent and ignores the stored preference.

  This is for the app that ships a single palette and has no accent picker. Removing the picker
  alone does not give those apps one theme: every returning visitor keeps rendering whatever accent
  they last chose, out of a record they can no longer change, against a palette designed around a
  different one. Changing the package default does not reach them either, for the reason above.

  They are a **pair, and must be set together to the same value** — the same rule `storageKey`
  already has, for the same reason. The script paints at first paint and the provider paints on
  hydration, so a pair that disagrees is one frame of the wrong accent followed by a snap, which is
  the exact flash the boot script is inlined to prevent, and nothing anywhere reports it. The
  whole-attribute-set diff in `getFoucScript.test.ts` now runs with both halves pinned, so a
  surface that learns to pin without the other fails there.

  A pin covers the accent and nothing else. The stored appearance (light / dark / system) is still
  read and still honoured — it is a preference about the reader's environment rather than about the
  product's palette — and `setAccentColor` still exists and still writes, it just no longer changes
  what is painted.

  Passing nothing keeps the previous behaviour exactly, on the stored accent.

### Patch Changes

- Updated dependencies [[`7be2cde`](https://github.com/davidz-repo/pineapple-design-systems/commit/7be2cde73c70402cadd8fbe6ca59916c3af6c698)]:
  - @pineappleui/tokens@0.2.0

## 0.2.1

### Patch Changes

- [#37](https://github.com/davidz-repo/pineapple-design-systems/pull/37) [`c4be810`](https://github.com/davidz-repo/pineapple-design-systems/commit/c4be810a8dc43ad3c6e8cd54c1fdb46aee4e160b) Thanks [@davidz-repo](https://github.com/davidz-repo)! - Correct where the README says to inline the first-paint script.

  Nothing about `getFoucScript()` changes — the published `dist/` is byte-identical. What changes
  is that the README stops contradicting itself, and stops giving the one instruction that makes
  the snippet do nothing.

  It said to inline the string in `<head>`, before any stylesheet or module tag, and then admitted
  two rows later that the script returns silently there because the mount point has not been
  parsed yet. Both cannot be true, and it is the second one that holds: the script looks `#root`
  up by id and returns if it is absent, so a `<head>` placement is a permanent no-op — it throws
  nothing, logs nothing, and leaves the consumer the flash they inlined it to remove, having
  followed the documentation exactly.

  The README now states the placement the script actually requires, in all three places it comes
  up: at the END of `<body>`, after the root element, which is still ahead of the deferred module
  script that mounts React. It is what this repo's own reference site has always done
  (`apps/site/vite.config.ts` injects with `injectTo: 'body'`).

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
