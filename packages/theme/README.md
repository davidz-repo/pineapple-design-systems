# @pineappleui/theme

The theme layer for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — the two providers
every other package renders inside, the global stylesheet they need, and the snippet that paints
the stored theme before any of it loads.

Appearance (light / dark / follow the OS) and accent colour are held as one preference record,
persisted to `localStorage`, and handed to [`@radix-ui/themes`](https://www.radix-ui.com/themes)'
`<Theme>`. Consumers mount two providers and import one stylesheet; nothing else in the design
system asks for theme state.

```bash
npm install @pineappleui/theme
```

## What it exports

```tsx
import {
  DesignSystemProvider,
  ThemePreferencesProvider,
  useThemePreferences,
} from '@pineappleui/theme';
import '@pineappleui/theme/styles.css';

<ThemePreferencesProvider>
  <DesignSystemProvider>{children}</DesignSystemProvider>
</ThemePreferencesProvider>;
```

| Export | What it is |
| --- | --- |
| `ThemePreferencesProvider` | Holds the preference record and persists it. Renders no DOM of its own. |
| `useThemePreferences()` | Reads that record — `appearance`, `accentColor`, and a setter for each. Throws outside the provider. |
| `DesignSystemProvider` | Renders Radix's `<Theme>` from the current preferences, resolving "follow the OS" against `matchMedia`. Takes an optional `accentColor` that pins the accent instead. |
| `getFoucScript()` | The first-paint script, as a string, for an inline `<script>` at the end of `<body>`. |
| `THEME_STORAGE_KEY` | The `localStorage` key the preference record is persisted under, as a value — for reading or migrating the record yourself, and the default both `storageKey` overrides replace. |
| `@pineappleui/theme/styles.css` | The stylesheet. A side-effect import, not a JS export. |

The accent names are `@pineappleui/tokens`' `ACCENT_COLORS`, and the appearance and preference
types come from there too. This package holds the state and the wiring; that one owns the
vocabulary, and a picker should be built from the exported list rather than a copy of it.

## The contract

- **The stylesheet is required, and it is the only one you import.** It pulls in Radix Themes'
  own stylesheet and the self-hosted Geist font itself, so a consumer that imports this one does
  not also import `@radix-ui/themes/styles.css`. Without it, every component in the system
  renders as unstyled markup — which reads as a broken component rather than a missing import.
- **Both providers, in that order.** `useThemePreferences` throws outside
  `ThemePreferencesProvider`, and `DesignSystemProvider` is one of its readers. The preferences
  provider is the outer one.
- **Exactly one `<Theme>`, and this package mounts it.** Nesting another Radix `<Theme>` inside
  is legal and half-applies: the inner one inherits whatever the outer set for anything it does
  not itself specify, so appearance and accent stop agreeing in ways that read as a theme bug.
- **Preferences persist per browser, under one `localStorage` key.** A stored record that does
  not match the current schema falls back to the defaults rather than throwing, so a renamed
  appearance value or a retired accent degrades to "first visit" instead of a blank page. That
  key is `THEME_STORAGE_KEY`, and `ThemePreferencesProvider`'s `storageKey` prop replaces it —
  for an app arriving with preferences already stored under a key of its own. Pass it and you
  must pass the **same** string to `getFoucScript({ storageKey })`: the two read one record, and
  a pair that disagrees is the flash the script exists to remove, reported by nothing. It also
  has to be a stable value — the key is read once, when the provider mounts.
- **"Follow the OS" is resolved here, not passed down.** Radix has no appearance value meaning
  "ask the OS", so `system` is resolved against `prefers-color-scheme` and re-resolves when the
  OS setting changes.
- **The first-paint script is opt-in, and it goes at the END of `<body>`, after your root
  element.** Inline the string in a `<script>` there — the last thing before `</body>` — and the
  page paints the stored theme instead of painting the default and snapping to it. It still runs
  ahead of React: the module script that mounts your tree is deferred, so it executes after this
  one. The placement is the whole of it, because getting it wrong fails silently: the script
  looks its mount point up by id and returns if that element is not there yet, so the same
  snippet in `<head>` — parsed before any of `<body>` — is a permanent no-op that throws nothing,
  logs nothing, and leaves you the flash you inlined it to remove. Skip the snippet deliberately
  and nothing breaks — you get that same flash. `getFoucScript()` takes no arguments in the
  ordinary case; the options exist for the tree that is not ordinary:

  | Option | Default | What it is |
  | --- | --- | --- |
  | `accentColor` | the stored accent, falling back to the package default | Pins the accent, ignoring what is stored. Set it together with `DesignSystemProvider`'s prop of the same name, to the same value — see the bullet below. |
  | `storageKey` | the key `ThemePreferencesProvider` persists under | The script and the provider have to read the same key, and the default is what makes them. A key that does not match is not an error anywhere — the script reads nothing, paints the default, and React snaps to the stored theme one frame later, which is the flash you inlined it to remove. |
  | `rootElementId` | `'root'` | The element the script paints. It must be the one your provider tree renders into: Radix's `<Theme>` claims that node on hydration, so painting any other is a first paint hydration disagrees with. If no such element exists when the script runs, it returns silently rather than throwing — throwing would take the page's other inline scripts down with it — and that silence is exactly why the snippet belongs after this element, at the end of `<body>`: run it any earlier and it finds nothing, paints nothing, and says nothing. |
- **An app with no accent picker pins the accent, on both surfaces.** Pass `accentColor` to
  `DesignSystemProvider` *and* the same value to `getFoucScript({ accentColor })`. Removing your
  picker is not enough on its own: a returning visitor keeps rendering the accent they last chose,
  out of a record they can no longer reach, and changing the package default does not touch them
  because a stored accent that is still valid is still honoured. Setting only one of the pair is
  the usual silent failure — first paint and hydration disagree, so the page shows one accent for
  a frame and then snaps. A pin covers the accent only: the stored appearance is still read and
  still honoured, and `setAccentColor` still writes, it just stops changing what is painted.
- **React, React DOM and Radix Themes are peers.** The consumer supplies one copy of each.
  `@pineappleui/tokens`, `@pineappleui/use-local-storage` and the Geist font package are real
  runtime dependencies of this one, installed with it; the font is a dependency because the
  stylesheet `@import`s it and your bundler is what resolves that.

## Licence

MIT © David Zhang
