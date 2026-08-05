---
"@pineappleui/badge": patch
"@pineappleui/button": patch
"@pineappleui/card": patch
"@pineappleui/heading": patch
"@pineappleui/icon-button": patch
"@pineappleui/icons": patch
"@pineappleui/inline": patch
"@pineappleui/live-region": patch
"@pineappleui/stack": patch
"@pineappleui/text": patch
"@pineappleui/text-area": patch
---

Describe every prop these packages document, in the packages' own words.

The built JS is unaffected for all eleven — JSDoc reaches nothing at runtime. What changes is
`dist/index.d.ts`, which is the file your editor reads: hovering `variant` on a `<Button>` used
to give you the union and stop there.

Radix Themes ships JSDoc on its shared layout props and on `Box`/`Flex`, and none at all on the
per-component prop defs behind `Button`, `Text`, `Heading`, `Card`, `Badge`, `IconButton` and
`TextArea`. Those seven inherit their whole prop surface as `ComponentPropsWithRef<typeof
RadixX>`, so there was nowhere to put a sentence: 63 of the 68 undescribed props in the docs
site's generated tables were theirs, and on eight of the sixteen package pages — nine tables,
Button and Text among them — the Description column was dropped altogether because every cell
in it was empty.

Each of the seven now intersects a block that re-states its props with the **same** type read
back off the Radix props (`variant?: RadixButtonProps['variant']`), purely to hang a
description on each. Nothing is narrowed, renamed or given a default: the checker resolves the
identical type, Radix's own declared defaults still come through, and a prop Radix adds later
still arrives through the intersection without being listed. `icons`, `inline`, `live-region`
and `stack` already declared their props and simply gained the five comments they were missing.

`text-field` is deliberately left as it was. It re-exports Radix's compound namespace whole so
that `TextField.RootProps` and `TextField.SlotProps` keep resolving for consumers, which means
it has no props type of its own to describe them in — and inventing one would break the export
this package exists to pass through.
