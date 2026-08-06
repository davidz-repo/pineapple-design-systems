# @pineappleui/dropdown-menu

## 0.1.0

### Minor Changes

- [#60](https://github.com/davidz-repo/pineapple-design-system/pull/60) [`5c812ce`](https://github.com/davidz-repo/pineapple-design-system/commit/5c812ce85684f9e1f05476a83474f71f5eb6c9d0) Thanks [@davidz-repo](https://github.com/davidz-repo)! - New package: `@pineappleui/dropdown-menu`, the WAI-ARIA menu-button pattern over
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

### Patch Changes

- [#64](https://github.com/davidz-repo/pineapple-design-system/pull/64) [`0e68c76`](https://github.com/davidz-repo/pineapple-design-system/commit/0e68c76ed3d0f93b27da7887319333d85d17ccff) Thanks [@davidz-repo](https://github.com/davidz-repo)! - A `disabled` `DropdownMenu.Trigger` now refuses `ArrowUp` as well as `Enter`,
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
