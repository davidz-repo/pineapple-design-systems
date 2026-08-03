---
"@pineappleui/stack": patch
"@pineappleui/inline": patch
---

Both packages gain the ref-forwarding test they shipped without.

Nothing about either component changes — the published `dist/` is byte-identical, and test
files never travel in the tarball. What changes is that the forwarding is now pinned: the ref
rides in `...rest`, past the destructured `direction` (and `wrap`), onto the `<div>` Radix's
`Flex` renders, and a refactor that stopped spreading `rest` would still render, still lay out,
and pass every class-name assertion these files already had while dropping every consumer's
`ref` on the floor.

`scripts/check-ref-tests.mjs` now fails the build for any package whose props carry a `ref` and
whose tests do not check that the ref arrives, so this gap cannot reopen quietly in a twelfth
package.
