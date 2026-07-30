# @pineappleui/icons

The icon primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[Lucide](https://lucide.dev) that fixes the size scale and the accessibility default, so call
sites never reach for `lucide-react` directly.

```bash
npm install @pineappleui/icons
```

## What it exports

```tsx
import { Icon } from '@pineappleui/icons';
import type { IconName, IconProps, IconSize } from '@pineappleui/icons';

<Icon name="check" size="lg" />;
<Icon name="close" label="Dismiss" />;
```

| Export | What it is |
| --- | --- |
| `Icon` | The component. Takes `name`, optional `size` and `label`, plus any other Lucide SVG prop. |
| `IconName` | The union of available glyph names — `keyof typeof ICONS`, not `string`. |
| `IconSize` | The union of size tokens — `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`. |
| `IconProps` | The full prop type. |

The glyph list is deliberately not reproduced here. `IconName` is the authoritative set, and a
second copy in prose is a copy that can fall out of date — your editor completes it from the
type, and `tsc` rejects a name that does not exist.

## Names are intent, not library

`name` is a semantic name (`close`, `mic-off`), mapped internally to a Lucide glyph. The mapping
is the indirection: the underlying icon set can be swapped, or one glyph traded for a better
one, without touching a single call site. Add an entry to the map the first time a glyph is
needed rather than importing from `lucide-react` at the call site.

## Sizes are tokens

`size` takes a token from the design scale and resolves it to pixels. A raw number is accepted
as an escape hatch for the rare off-scale case; reaching for it routinely means the scale is
wrong and should change. The default is `md`.

## Decorative by default

An `Icon` with no `label` renders `aria-hidden="true"` and no `role` — correct for the common
case, where the icon sits next to a text label or inside a button that already has an accessible
name, and announcing it again is noise.

Pass `label` **only** when the icon carries meaning on its own. It then renders with
`role="img"` and that accessible name. The default is the safe one: a missing label is a silent
icon, while a spurious one is a screen reader saying "phone off" twice.

## Licence

MIT © David Zhang
