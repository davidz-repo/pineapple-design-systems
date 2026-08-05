# @pineappleui/icon-button

The icon-only button for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `IconButton`, so call sites reach for the
design system rather than importing Radix directly.

Same indirection as
[`@pineappleui/button`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/button),
with the square geometry a single glyph wants instead of the padding a text label wants. It ships
no glyphs of its own — the icon is the child you pass, from
[`@pineappleui/icons`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/icons)
or anywhere else.

```bash
npm install @pineappleui/icon-button
```

## What it exports

```tsx
import { IconButton } from '@pineappleui/icon-button';
import type { IconButtonProps } from '@pineappleui/icon-button';

<IconButton aria-label="Copy" onClick={onCopy}>{icon}</IconButton>;
```

| Export | What it is |
| --- | --- |
| `IconButton` | The element. Takes every prop Radix's `IconButton` takes, including `ref`. |
| `IconButtonProps` | Its props — `ComponentPropsWithRef<typeof IconButton>` from Radix, re-exported so consumers do not import the type from Radix either. |

This README does not hand-write the prop set: `IconButtonProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.
The docs site generates the full table from those same types —
https://designpineapple.com/components/icon-button.

## The contract

- **Give it an accessible name.** There is no text to read, so without `aria-label` (or an
  `aria-labelledby`) the control announces as "button" and the glyph tells a screen-reader user
  nothing. This is the one prop the component cannot supply a sensible default for.
- **Radix Themes is a peer, and its stylesheet has to be loaded.** `variant`, `size`, `color` and
  `radius` compile to Radix class names; without Radix's CSS in the page they resolve to nothing
  and the square collapses to a browser button around the glyph. Render this inside Radix's
  `<Theme>`.
- **It renders a real `<button>`.** Keyboard activation and the `button` role come from the
  element. Inside a `<form>`, set `type="button"` for anything that is not the submit control.
- **`loading` disables the button while it spins.** Radix swaps the glyph for a spinner and marks
  the element disabled, so a second click cannot fire mid-request.
- **`ref` reaches the DOM element.** Nothing is wrapped, so focusing or measuring the rendered
  node works as it would on a plain `<button>` — which is what an anchored popover or tooltip
  needs.

## Licence

MIT © David Zhang
