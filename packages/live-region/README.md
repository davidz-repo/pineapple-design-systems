# @pineappleui/live-region

The `aria-live` announcement wrapper for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-system) — one reviewed
primitive for every screen-reader announcement region, so politeness, atomicity and the
stay-mounted rule live in one place instead of being hand-rolled per feature.

Invisible chrome. It renders a single element with the right ARIA attributes and its children
inside; it has no styling, no state and no effects.

```bash
npm install @pineappleui/live-region
```

## What it exports

```tsx
import { LiveRegion } from '@pineappleui/live-region';
import type { LiveRegionProps } from '@pineappleui/live-region';

<LiveRegion politeness="polite">{status}</LiveRegion>;
```

| Export | What it is |
| --- | --- |
| `LiveRegion` | The announcement region component. |
| `LiveRegionProps` | Its props: `children`, `politeness`, `atomic`, `as`, `role`, `className`, `id`. |

## The contract

Three rules the caller has to uphold — the component cannot enforce them, and each one is a
real announcement bug when it is broken:

- **Keep the region mounted and swap its children.** A region that mounts already filled is not
  reliably announced. Render `<LiveRegion>{message}</LiveRegion>` unconditionally and change
  `message`; do not mount and unmount the region itself.
- **One region per independent announcement stream.** Two unrelated streams sharing a region
  coalesce, and screen readers double- or mis-announce.
- **`assertive` interrupts.** `polite` (the default) waits for a pause. Reach for `assertive`
  only when the message genuinely cannot wait.

`atomic` re-announces the full content on any change — right for caption-style text that is
rewritten in place, wrong for append-style streams, where it re-reads everything each time.

## Licence

MIT © David Zhang
