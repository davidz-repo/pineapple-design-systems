# @pineappleui/text-field

The single-line text input for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a thin wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `TextField`, so call sites reach for the
design system rather than importing Radix directly.

No styling of its own, no state, no effects: it renders a native `<input>` and passes everything
through. The point is the indirection — a change of default, or a swap of the layer underneath,
happens here once instead of at every import site. Multi-line input is
[`@pineappleui/text-area`](https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/text-area).

```bash
npm install @pineappleui/text-field
```

## What it exports

```tsx
import { TextField } from '@pineappleui/text-field';

<TextField.Root size="3" placeholder="you@example.com">
  <TextField.Slot>@</TextField.Slot>
</TextField.Root>;
```

| Export | What it is |
| --- | --- |
| `TextField` | Radix's compound namespace, re-exported whole — this package adds no third part to it. |
| `TextField.Root` | The field. A `<div>` wrapping a native `<input>`; takes every prop Radix's `Root` takes, including `ref`. |
| `TextField.Slot` | An adornment rendered inside the field — an icon, a unit, a prefix. `side` places it left or right. |

The prop types ride along on the namespace as `TextField.RootProps` and `TextField.SlotProps`, so
consumers do not import those from Radix either. This README does not hand-write the prop set:
those types are the authoritative ones, your editor completes from them, and a second copy in prose
is a copy that goes stale without failing. The docs site generates the full table from those same
types — https://designpineapple.com/components/text-field.

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size`, `variant`, `color` and
  `radius` compile to Radix class names; without Radix's CSS in the page they resolve to nothing and
  the field renders as a bare browser input. Render this inside Radix's `<Theme>`.
- **`ref` reaches the `<input>`, not the wrapper.** The `<div>` is Radix's own layout element for
  the slots; the ref is composed onto the input, which is the node you focus, select in, or read
  `value` from.
- **It is uncontrolled until you control it.** `value`, `defaultValue`, `onChange` and the rest are
  the native input's, unchanged — this package holds no state of its own and never will.
- **A slot is decoration; the input is the control.** Pointing at a slot focuses the input and puts
  the caret at the near end of the text, so an adornment never swallows a click. Put buttons inside
  a slot when you need one, not a click handler on the slot itself.
- **`color` takes an accent name, not a CSS colour.** Omit it to inherit the theme accent. A raw hex
  belongs in `style` for the rare off-scale case, and reaching for it routinely means the palette is
  wrong and should change.
- **A field needs a label, and this does not render one.** Pair it with a `<label htmlFor>` — a
  placeholder disappears on the first keystroke and is not an accessible name.

## Licence

MIT © David Zhang
