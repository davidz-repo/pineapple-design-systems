# @pineappleui/badge

The badge primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `Badge`, so call sites reach for the design
system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders one element and passes everything
through. The point is the indirection — a change of shape, or a swap of the layer underneath,
happens here once instead of at every import site.

```bash
npm install @pineappleui/badge
```

## What it exports

```tsx
import { Badge } from '@pineappleui/badge';
import type { BadgeProps } from '@pineappleui/badge';

<Badge color="crimson" variant="solid">{children}</Badge>;
```

| Export | What it is |
| --- | --- |
| `Badge` | The element. Takes every prop Radix's `Badge` takes, including `ref`. |
| `BadgeProps` | Its props — `ComponentPropsWithRef<typeof Badge>` from Radix, re-exported so consumers do not import the type from Radix either, and described here in this package's own words. |

This README does not hand-write the prop set: `BadgeProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.
The docs site generates the full table from those same types —
[Badge on designpineapple.com](https://designpineapple.com/components/badge).

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size`, `variant`, `color` and
  `radius` compile to Radix class names; without Radix's CSS in the page they resolve to nothing
  and the badge renders as bare inline text. Render this inside Radix's `<Theme>`.
- **It renders a `<span>`.** A badge is inline content, so it sits inside a line of text or beside
  a heading without breaking the flow. Wrapping it in a block element is the consumer's call.
- **`color` takes an accent name, not a CSS colour.** Omit it to inherit the theme accent. A raw
  hex belongs in `style` for the rare off-scale case, and reaching for it routinely means the
  palette is wrong and should change.
- **The label is yours, and so is its meaning.** This package styles a short piece of text; it
  encodes no status vocabulary of its own. Anything that maps a domain state to a colour belongs
  in the consuming app, not here.
- **`ref` reaches the DOM element.** Nothing is wrapped, so measuring, positioning or observing
  the rendered node works as it would on a plain `<span>`.

## Licence

MIT © David Zhang
