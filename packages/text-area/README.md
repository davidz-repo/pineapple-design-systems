# @pineappleui/text-area

The multi-line text input for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `TextArea`, so call sites reach for the
design system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders a native `<textarea>` and passes everything
through. The point is the indirection — a change of default, or a swap of the layer underneath,
happens here once instead of at every import site. Single-line input is
[`@pineappleui/text-field`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/text-field).

```bash
npm install @pineappleui/text-area
```

## What it exports

```tsx
import { TextArea } from '@pineappleui/text-area';
import type { TextAreaProps } from '@pineappleui/text-area';

<TextArea size="3" resize="vertical" placeholder="Share your notes…" />;
```

| Export | What it is |
| --- | --- |
| `TextArea` | The field. Takes every prop Radix's `TextArea` takes, including `ref`. |
| `TextAreaProps` | Its props — `ComponentPropsWithRef<typeof TextArea>` from Radix, re-exported so consumers do not import the type from Radix either. |

The prop set is deliberately not reproduced here. `TextAreaProps` is the authoritative one, your
editor completes from it, and a second copy in prose is a copy that goes stale without failing.

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size`, `variant`, `color`,
  `radius` and `resize` compile to Radix class names; without Radix's CSS in the page they resolve
  to nothing and the field renders as a bare browser textarea. Render this inside Radix's `<Theme>`.
- **`ref` reaches the `<textarea>`, not the wrapper.** Radix wraps the control in a `<div>` for the
  border and focus ring; the ref is the node you focus, select in, or read `value` from.
- **It is uncontrolled until you control it.** `value`, `defaultValue`, `onChange` and the rest are
  the native textarea's, unchanged — this package holds no state of its own and never will.
- **`resize` is the user's handle, not autosizing.** It maps to the CSS `resize` property. A field
  that grows with its content is a behaviour, and behaviours belong in the consumer.
- **`color` takes an accent name, not a CSS colour.** Omit it to inherit the theme accent. A raw hex
  belongs in `style` for the rare off-scale case, and reaching for it routinely means the palette is
  wrong and should change.
- **A field needs a label, and this does not render one.** Pair it with a `<label htmlFor>` — a
  placeholder disappears on the first keystroke and is not an accessible name.

## Licence

MIT © David Zhang
