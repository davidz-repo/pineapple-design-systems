---
"@pineappleui/theme": minor
---

Let a consumer pin the scale, on both surfaces that paint it.

`DesignSystemProvider` hardcoded `scaling="100%"` and `getFoucScript` hardcoded
the matching `data-scaling` attribute, so an app that wanted to read larger or
smaller had no way to say so without forking one of them — and forking either
alone is a page that paints at one size and reflows at another on hydration.

Both now take a `scaling` option, defaulting to the same `100%` they were
pinned to, so nothing changes for a consumer who passes neither. `Scaling` and
`DEFAULT_SCALING` are exported for apps holding the value as a shared constant;
the type is derived from Radix's own `<Theme>` rather than hand-typed, so it
cannot fall behind a step Radix adds.
