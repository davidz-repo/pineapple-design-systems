# @pineappleui/box

The generic box for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-system) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `Box`, so call sites reach for the design
system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders one element and passes everything
through. The point is the indirection — a spacing default or a swap of the layer underneath
happens here once instead of at every import site.

```bash
npm install @pineappleui/box
```

## What it exports

```tsx
import { Box } from '@pineappleui/box';
import type { BoxProps } from '@pineappleui/box';

<Box p="4" width="320px">{children}</Box>;
```

| Export | What it is |
| --- | --- |
| `Box` | The element. Takes every prop Radix's `Box` takes, including `ref`. |
| `BoxProps` | Its props — `ComponentPropsWithRef<typeof Box>` from Radix, re-exported so consumers do not import the type from Radix either. |

This README does not hand-write the prop set: `BoxProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.
The docs site generates the full table from those same types —
[Box on designpineapple.com](https://designpineapple.com/components/box).

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** The padding and sizing props
  compile to Radix class names; without Radix's CSS in the page they resolve to nothing and the
  box renders unstyled. Render this inside Radix's `<Theme>`.
- **Spacing props take scale tokens, not CSS lengths.** `p="4"` is a step on Radix's space
  scale. A raw length belongs in `style` for the rare off-scale case, and reaching for it
  routinely means the scale is wrong and should change.
- **`ref` reaches the DOM element.** Nothing is wrapped, so measuring, focusing or observing the
  rendered node works as it would on a plain `<div>`.

## Licence

MIT © David Zhang
