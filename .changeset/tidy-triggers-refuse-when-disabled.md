---
"@pineappleui/dropdown-menu": patch
---

A `disabled` `DropdownMenu.Trigger` now refuses `ArrowUp` as well as `Enter`,
`Space` and `ArrowDown`.

Radix's own trigger handler returns early on its `disabled` prop before it looks
at the key, so those three were already refused — while `ArrowUp`, the key this
package adds for the APG, opened the panel anyway. The guard reads the prop
rather than the DOM, matching Radix.

A real `<button disabled>` fires no keydown, so this was unreachable through one.
It is reachable whenever the trigger stays focusable and carries its disabled
state another way — `aria-disabled`, or an `asChild` child that takes the prop
and renders something other than a disabled button — which is the accessible
pattern, and the reason Radix guards on the prop in the first place.
