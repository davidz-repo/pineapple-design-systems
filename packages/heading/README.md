# @pineappleui/heading

The heading primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a
[`@radix-ui/themes`](https://www.radix-ui.com/themes) `Heading` that gives each semantic level a
default size, so `<Heading as="h3">` looks like an h3 without being told to.

That default is the whole addition. Radix's `as` sets the tag and nothing else, which means an
unstyled `h1` through `h6` all render at the same size and the document outline stops matching
what the page looks like. Body copy is
[`@pineappleui/text`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/text).

```bash
npm install @pineappleui/heading
```

## What it exports

```tsx
import { Heading } from '@pineappleui/heading';
import type { HeadingProps } from '@pineappleui/heading';

<Heading as="h2">{children}</Heading>;
```

| Export | What it is |
| --- | --- |
| `Heading` | The element. Every prop Radix's `Heading` takes, including `ref`, with `size` defaulted from `as`. |
| `HeadingProps` | Its props — `ComponentPropsWithRef<typeof Heading>` from Radix, re-exported so consumers do not import the type from Radix either. |

The prop set is deliberately not reproduced here. `HeadingProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.

## The contract

- **`as` picks the outline level; the size follows it.** Each level maps to a step on Radix's
  type scale, descending from `h1`. Choose `as` for the document structure a screen reader walks,
  not for the size you want.
- **An explicit `size` always wins.** Pass one when a level has to look smaller or larger than
  its rank — the semantic tag is unchanged, so the outline stays honest.
- **A bare `<Heading>` is left alone.** With no `as`, there is no level to map from, so Radix's
  own default size applies rather than the `h1` step.
- **Radix Themes is a peer, and its stylesheet has to be loaded.** The sizes compile to Radix
  class names; without Radix's CSS in the page they resolve to nothing and every level falls back
  to the browser's own heading sizes. Render this inside Radix's `<Theme>`.
- **`ref` reaches the DOM element.** Nothing is wrapped, so measuring, focusing or scrolling to
  the rendered node works as it would on a plain `<h2>`.

## Licence

MIT © David Zhang
