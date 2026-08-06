---
"@pineappleui/dropdown-menu": minor
---

New package: `@pineappleui/dropdown-menu`, the WAI-ARIA menu-button pattern over
`@radix-ui/themes`' `DropdownMenu`. Thirteen members on one namespace
(`Root`, `Trigger`, `Content`, `Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`,
`Label`, `Group`, `Separator`, `Sub`, `SubTrigger`, `SubContent`), each carrying its
own described prop overlay so the docs site's table has no blank cells.

Two deliberate behaviours of its own, both patching a gap between Radix and the APG:
`Tab`/`Shift+Tab` closes the menu and moves focus onward rather than being swallowed,
and `ArrowUp` on a closed trigger opens the panel with its last enabled item focused.
`loop` defaults to `true` here, against Radix's `false`.

Radix's `TriggerIcon` is deliberately not re-exported — use
`<Icon name="chevron-down" />` from `@pineappleui/icons`, which is the system's own
chevron at the system's own metrics.
