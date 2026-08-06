# @pineappleui/stack

The vertical layout primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-system) — a
[`@radix-ui/themes`](https://www.radix-ui.com/themes) `Flex` whose `direction` is narrowed to
the column variants, so the name and the behaviour cannot drift apart.

A stack that can be told to lay out horizontally is a `Flex` with a misleading name. Constraining
the prop is what makes "stack" mean something at a glance; rows are
[`@pineappleui/inline`](https://github.com/davidz-repo/pineapple-design-system/tree/main/packages/inline).

```bash
npm install @pineappleui/stack
```

## What it exports

```tsx
import { Stack } from '@pineappleui/stack';
import type { StackProps } from '@pineappleui/stack';

<Stack gap="3" align="stretch">{children}</Stack>;
```

| Export | What it is |
| --- | --- |
| `Stack` | The column. Every Radix `Flex` prop, with `direction` narrowed to `'column' \| 'column-reverse'`. |
| `StackProps` | Its props — Radix's `Flex` props with that one substitution. |

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `gap`, `align` and `justify`
  compile to Radix class names; without Radix's CSS in the page they resolve to nothing and the
  children stack in document order with no spacing. Render this inside Radix's `<Theme>`.
- **`direction` defaults to `column` and only accepts column variants.** Passing a row value is
  a type error, not a silent re-layout. Reach for `Inline` instead.
- **`gap` takes a scale token, not a CSS length.** It is a step on Radix's space scale, so
  spacing stays consistent across every stack in an app.

## Licence

MIT © David Zhang
