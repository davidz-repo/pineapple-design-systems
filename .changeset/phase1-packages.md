---
"@pineappleui/use-local-storage": minor
"@pineappleui/live-region": minor
"@pineappleui/icons": minor
---

First public release of `@pineappleui/use-local-storage`, `@pineappleui/live-region` and
`@pineappleui/icons` — the three Phase 1 packages, none of which depends on another `@pineappleui`
package. `use-local-storage` is the hook that syncs a piece of state to `localStorage`;
`live-region` is the audited `aria-live` announcement wrapper; `icons` is the Lucide wrapper with
design-system size tokens and decorative-by-default a11y, and ships `lucide-react` as its one
runtime dependency. React is a peer everywhere. Ported from the private monorepo they grew in, with
the scope renamed and the publish contract (public access, MIT licence, `dist/`-rooted entry points)
applied.
