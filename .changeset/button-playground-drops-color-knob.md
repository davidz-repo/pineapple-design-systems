---
"@pineappleui/button": patch
---

The Button playground story drops its `color` knob.

Nothing about `Button` changes — the published component still takes `color`, and the tarball is
otherwise untouched. This is about what the playground OFFERS, which is a different question from
what the component supports.

Both surfaces that render these stories already answer the accent question themselves, at a
larger scope than one button: the docs site pins a single accent for the whole page, and the
gallery has a picker in its own toolbar that repaints the entire frame. A third control for the
same thing, scoped to the one button in the preview, disagreed with both — it tinted the demo
against a page that was not going to follow it.

The button in the playground now inherits the theme accent, which is what every other button on
either surface does. A shared playground link carrying a stale `?color=` degrades on its own:
the site drops URL args it cannot match to an option.
