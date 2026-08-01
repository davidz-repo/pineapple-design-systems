# @pineappleui/inline

The horizontal layout primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a
[`@radix-ui/themes`](https://www.radix-ui.com/themes) `Flex` whose `direction` is narrowed to the
row variants and whose `wrap` defaults to wrapping.

The default is the interesting part. A row of chips, tags or buttons that does not wrap overflows
its container at the first narrow viewport, and overflow is the failure nobody sees on a desktop
screen. Columns are
[`@pineappleui/stack`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/stack).

```bash
npm install @pineappleui/inline
```

## What it exports

```tsx
import { Inline } from '@pineappleui/inline';
import type { InlineProps } from '@pineappleui/inline';

<Inline gap="2" align="center">{children}</Inline>;
```

| Export | What it is |
| --- | --- |
| `Inline` | The row. Every Radix `Flex` prop, with `direction` narrowed to `'row' \| 'row-reverse'`. |
| `InlineProps` | Its props — Radix's `Flex` props with that one substitution. |

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `gap`, `align`, `justify` and
  `wrap` compile to Radix class names; without Radix's CSS in the page they resolve to nothing
  and the children fall back to inline document flow. Render this inside Radix's `<Theme>`.
- **`wrap` defaults to `wrap`.** Pass `wrap="nowrap"` explicitly for the rare row that must stay
  on one line — and give it an overflow story when you do.
- **`direction` defaults to `row` and only accepts row variants.** Passing a column value is a
  type error, not a silent re-layout. Reach for `Stack` instead.
- **`gap` takes a scale token, not a CSS length.** It is a step on Radix's space scale, so
  spacing stays consistent across every row in an app.

## Licence

MIT © David Zhang
