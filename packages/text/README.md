# @pineappleui/text

The body-copy primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `Text`, so call sites reach for the design
system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders one element and passes everything
through. The point is the indirection — a type-scale change or a swap of the layer underneath
happens here once instead of at every import site. Headings are
[`@pineappleui/heading`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/heading).

```bash
npm install @pineappleui/text
```

## What it exports

```tsx
import { Text } from '@pineappleui/text';
import type { TextProps } from '@pineappleui/text';

<Text size="3" weight="medium">{children}</Text>;
```

| Export | What it is |
| --- | --- |
| `Text` | The element. Takes every prop Radix's `Text` takes, including `ref`. |
| `TextProps` | Its props — `ComponentPropsWithRef<typeof Text>` from Radix, re-exported so consumers do not import the type from Radix either. |

The prop set is deliberately not reproduced here. `TextProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size`, `weight` and `color`
  compile to Radix class names; without Radix's CSS in the page they resolve to nothing and the
  text renders at the browser default. Render this inside Radix's `<Theme>`.
- **It renders a `<span>` unless you say otherwise.** A span is inline, so a paragraph of body
  copy wants `as="p"` — the default is the safe one to nest, not the right one for a block of
  prose.
- **Size and weight take scale tokens, not CSS values.** `size="3"` is a step on Radix's type
  scale. A raw `font-size` belongs in `style` for the rare off-scale case, and reaching for it
  routinely means the scale is wrong and should change.
- **`ref` reaches the DOM element.** Nothing is wrapped, so measuring, focusing or observing the
  rendered node works as it would on a plain `<span>`.

## Licence

MIT © David Zhang
