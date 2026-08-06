# @pineappleui/button

The button primitive for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-system) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `Button`, so call sites reach for the design
system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders one element and passes everything
through. The point is the indirection — a change to the default variant, or a swap of the layer
underneath, happens here once instead of at every import site. A button whose whole content is a
glyph is
[`@pineappleui/icon-button`](https://github.com/davidz-repo/pineapple-design-system/tree/main/packages/icon-button).

```bash
npm install @pineappleui/button
```

## What it exports

```tsx
import { Button } from '@pineappleui/button';
import type { ButtonProps } from '@pineappleui/button';

<Button variant="soft" onClick={onSave}>{children}</Button>;
```

| Export | What it is |
| --- | --- |
| `Button` | The element. Takes every prop Radix's `Button` takes, including `ref`. |
| `ButtonProps` | Its props — `ComponentPropsWithRef<typeof Button>` from Radix, re-exported so consumers do not import the type from Radix either, and described here in this package's own words. |

This README does not hand-write the prop set: `ButtonProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.
The docs site generates the full table from those same types —
[Button on designpineapple.com](https://designpineapple.com/components/button).

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `variant`, `size`, `color` and
  `radius` compile to Radix class names; without Radix's CSS in the page they resolve to nothing
  and the button renders as the browser's own. Render this inside Radix's `<Theme>`.
- **It renders a real `<button>`.** Keyboard activation, form submission and the `button` role
  come from the element, not from handlers bolted on. Inside a `<form>`, set `type="button"` for
  anything that is not the submit control — that default is the platform's, not ours.
- **`loading` disables the button while it spins.** Radix swaps the content for a spinner and
  marks the element disabled, so a second click cannot fire mid-request. Pass it while an action
  is in flight rather than hiding the button.
- **Navigation is an `<a>`, not a click handler.** Use `asChild` over a link when the action
  changes the URL, so middle-click, copy-link and the status bar keep working.
- **`ref` reaches the DOM element.** Nothing is wrapped, so focusing or measuring the rendered
  node works as it would on a plain `<button>`.

## Licence

MIT © David Zhang
