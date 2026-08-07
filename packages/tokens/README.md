# @pineappleui/tokens

Design tokens for [`@pineappleui`](https://github.com/davidz-repo/pineapple-design-system) — the
accent-colour vocabulary and the theme-preference types that every other package in the system
derives from.

Pure data. No React, no CSS, no runtime behaviour: this package does not read `matchMedia`,
does not touch `localStorage`, and does not render. Resolving a preference into an actual theme
is the consuming provider's job.

```bash
npm install @pineappleui/tokens
```

## What it exports

```ts
import { ACCENT_COLORS } from '@pineappleui/tokens';
import type { AccentColor, AppearanceSetting, ThemePreferences } from '@pineappleui/tokens';
```

| Export | What it is |
| --- | --- |
| `ACCENT_COLORS` | The accent names a consuming UI may offer, in accent-picker order. |
| `AccentColor` | `typeof ACCENT_COLORS[number]` — a union, not `string`. |
| `AppearanceSetting` | `'light' \| 'dark' \| 'system'`. |
| `ThemePreferences` | `{ appearance, accentColor }` — the stored preference shape. |

The array is deliberately not reproduced here. `ACCENT_COLORS` is the authoritative list, and a
second copy in prose is a copy that can fall out of date. Read it from the export.

Two things about it that are *not* obvious from the values:

- **Array order is accent-picker order.** It carries no implication about which accent is the
  default.
- **`bronze` is the default accent, and it sits last.** Position and default status are
  independent. It pairs with the `sand` gray.

## Deriving, not copying

Anything that needs the list must import it — including code that ends up as a string. A
FOUC-prevention snippet runs before any bundle loads and cannot itself import, but the module
that *generates* that snippet is ordinary code and can:

```ts
import { ACCENT_COLORS } from '@pineappleui/tokens';

const script = `var ACCENT_COLORS = ${JSON.stringify([...ACCENT_COLORS])};`;
```

This is not a style preference. A hand-typed copy of the list does not fail when it falls out of
date — it just quietly disagrees, and a user's saved accent stops resolving. `check-token-drift`
in this repo fails CI on any package that restates a list this package owns.

## Appearance is tri-state

`'system'` means *match the OS preference*, and is a stored value in its own right — distinct
from having resolved to `'light'` or `'dark'` at a moment in time. Collapsing the three into a
boolean loses the user's actual choice: someone who picked "system" in June has not picked
"light".

## Licence

MIT © David Zhang
