# @pineappleui/card

The card surface for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `Card`, so call sites reach for the design
system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders one element and passes everything
through. The point is the indirection — a change to the surface treatment, or a swap of the layer
underneath, happens here once instead of at every import site.

```bash
npm install @pineappleui/card
```

## What it exports

```tsx
import { Card } from '@pineappleui/card';
import type { CardProps } from '@pineappleui/card';

<Card size="3" variant="classic">{children}</Card>;
```

| Export | What it is |
| --- | --- |
| `Card` | The element. Takes every prop Radix's `Card` takes, including `ref`. |
| `CardProps` | Its props — `ComponentPropsWithRef<typeof Card>` from Radix, re-exported so consumers do not import the type from Radix either. |

This README does not hand-write the prop set: `CardProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.
The docs site generates the full table from those same types —
[Card on designpineapple.com](https://designpineapple.com/components/card).

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size` and `variant` compile to
  Radix class names; without Radix's CSS in the page they resolve to nothing and the card renders
  as an undecorated `<div>`. Render this inside Radix's `<Theme>`.
- **`size` is the internal padding, on the space scale.** It is a step, not a CSS length, so every
  card in an app is inset by the same rhythm. It says nothing about the card's width — that is the
  layout's job.
- **It is a `<div>`, not a control.** A whole card that navigates or opens something needs a real
  interactive element: `asChild` over an `<a>` or a `<button>` makes the card *be* that element
  rather than a div with a click handler.
- **`ref` reaches the DOM element.** Nothing is wrapped, so measuring or observing the rendered
  node works as it would on a plain `<div>`.

## Licence

MIT © David Zhang
