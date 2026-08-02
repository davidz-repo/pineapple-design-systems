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
| `DesignSystemProvider` | Renders Radix's `<Theme>` from the current preferences, resolving "follow the OS" against `matchMedia`. |
| `getFoucScript({ storageKey })` | The first-paint script, as a string, for an inline `<script>` in `<head>`. |
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
  appearance value or a retired accent degrades to "first visit" instead of a blank page.
- **"Follow the OS" is resolved here, not passed down.** Radix has no appearance value meaning
  "ask the OS", so `system` is resolved against `prefers-color-scheme` and re-resolves when the
  OS setting changes.
- **The first-paint script is opt-in, and it is the consumer's `<head>` that runs it.** Inline
  the string in a `<script>` **before** any stylesheet or module tag, pass it the same storage
  key the provider uses, and the page paints the stored theme instead of painting the default
  and snapping to it. Skip it and nothing breaks — you get the flash.
- **React, React DOM and Radix Themes are peers.** The consumer supplies one copy of each.
  `@pineappleui/tokens`, `@pineappleui/use-local-storage` and the Geist font package are real
  runtime dependencies of this one, installed with it; the font is a dependency because the
  stylesheet `@import`s it and your bundler is what resolves that.

## Licence

MIT © David Zhang
