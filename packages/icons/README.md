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
import { Icon, ICON_NAMES, ICON_SIZES } from '@pineappleui/icons';
import type { IconName, IconProps, IconSize } from '@pineappleui/icons';

<Icon name="check" size="lg" />;
<Icon name="close" label="Dismiss" />;
```

| Export | What it is |
| --- | --- |
| `Icon` | The component. Takes `name`, optional `size` and `label`, plus any other Lucide SVG prop. |
| `ICON_NAMES` | Every glyph name at runtime, in declaration order — `readonly IconName[]`. |
| `ICON_SIZES` | Every size token at runtime, smallest first — `readonly IconSize[]`. |
| `IconName` | The union of available glyph names — `keyof typeof ICONS`, not `string`. |
| `IconSize` | The union of size tokens — `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`. |
| `IconProps` | The full prop type. |

This README does not hand-write the glyph list. `IconName` is the authoritative set, and a
second copy in prose is a copy that can fall out of date — your editor completes it from the
type, and `tsc` rejects a name that does not exist. The docs site prints the whole set, as
`Icon`'s `name` type, generated from that same union —
[Icon on designpineapple.com](https://designpineapple.com/components/icons).

## Enumerating the set

A type cannot be iterated, so a UI that has to *show* the options — an icon picker, a gallery,
a `<select>` — needs the list as a value. `ICON_NAMES` and `ICON_SIZES` are exactly that, both
derived from the internal maps rather than written out a second time:

```tsx
{ICON_NAMES.map(name => (
  <button key={name} type="button" onClick={() => onPick(name)}>
    <Icon name={name} size="lg" />
    {name}
  </button>
))}
```

Because they are derived, adding a glyph to the map adds it to every picker built on them —
there is no second list to remember. Prefer them to a hand-typed array for the same reason this
README does not list the names: a copy is a thing that goes stale without failing.

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
