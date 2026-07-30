---
"@pineappleui/use-local-storage": minor
"@pineappleui/live-region": minor
"@pineappleui/icons": minor
---

First public release of `@pineappleui/use-local-storage`, `@pineappleui/live-region` and
`@pineappleui/icons` — the three Phase 1 packages, each depending only on React. `use-local-storage`
is the hook that syncs a piece of state to `localStorage`; `live-region` is the audited `aria-live`
announcement wrapper; `icons` is the Lucide wrapper with design-system size tokens and
decorative-by-default a11y. Ported from the private monorepo they grew in, with the scope renamed and
the publish contract (public access, MIT licence, `dist/`-rooted entry points) applied.
