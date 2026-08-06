# @pineappleui/dropdown-menu

The menu button for
[`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) — a wrapper over
[`@radix-ui/themes`](https://www.radix-ui.com/themes)' `DropdownMenu`, so call sites reach for the
design system rather than importing Radix directly.

A trigger that discloses a list of **commands**: the WAI-ARIA
[menu-button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) pattern, plus checkbox and
radio items, groups, separators and one level of submenu. Commands, not options — if the thing
holds a value and belongs in a form, you want a select, and that word is the whole boundary
between the two.

```bash
npm install @pineappleui/dropdown-menu
```

## What it exports

One namespace-shaped value, `DropdownMenu`, with thirteen members. Each member's prop type rides
along on it (`DropdownMenu.ItemProps`, `DropdownMenu.ContentProps`, …), so consumers do not import
those from Radix either.

```tsx
import { Button } from '@pineappleui/button';
import { DropdownMenu } from '@pineappleui/dropdown-menu';
import { Icon } from '@pineappleui/icons';

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="soft">
      Actions
      <Icon name="chevron-down" size="sm" />
    </Button>
  </DropdownMenu.Trigger>

  <DropdownMenu.Content>
    <DropdownMenu.Label id="menu-file">File</DropdownMenu.Label>
    <DropdownMenu.Group aria-labelledby="menu-file">
      <DropdownMenu.Item shortcut="⌘C" onSelect={copyLink}>
        <Icon name="copy" size="sm" />
        Copy link
      </DropdownMenu.Item>
      <DropdownMenu.Item onSelect={openRenameDialog}>Rename…</DropdownMenu.Item>
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.CheckboxItem
      checked={showArchived}
      onCheckedChange={setShowArchived}
      onSelect={event => event.preventDefault()}
    >
      Show archived
    </DropdownMenu.CheckboxItem>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>Move to</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>{/* Items */}</DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <DropdownMenu.Separator />
    <DropdownMenu.Item color="crimson" onSelect={remove}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>;
```

| Export | What it is |
| --- | --- |
| `DropdownMenu.Root` | Holds the open state. No DOM, no ref. |
| `DropdownMenu.Trigger` | The button that discloses the panel. Takes exactly one element child. |
| `DropdownMenu.Content` | The panel — `role="menu"`, portalled, positioned, scrollable. |
| `DropdownMenu.Item` | One command. `onSelect`, `shortcut`, `disabled`, `color`, `asChild`. |
| `DropdownMenu.CheckboxItem` | A command carrying an on/off state — `role="menuitemcheckbox"`. |
| `DropdownMenu.RadioGroup` / `RadioItem` | A set of mutually exclusive choices — `role="menuitemradio"`. |
| `DropdownMenu.Label` / `Group` / `Separator` | A heading, a `role="group"`, a rule. |
| `DropdownMenu.Sub` / `SubTrigger` / `SubContent` | One level of nested menu. |

This README does not hand-write the prop set: those types are the authoritative ones, your editor
completes from them, and a second copy in prose is a copy that goes stale without failing. The docs
site generates the full table from those same types —
[DropdownMenu on designpineapple.com](https://designpineapple.com/components/dropdown-menu).

## The contract

- **Radix Themes is a peer, and its stylesheet has to be loaded.** `size`, `variant`, `color` and
  the rest compile to Radix class names. More than that: `Content` reads Radix's theme context and
  **throws** without a `<Theme>` above it, rather than merely rendering unstyled. Render this inside
  `@pineappleui/theme`'s `DesignSystemProvider`, or inside Radix's own `<Theme>`.
- **The trigger is your element, and it must take a ref.** `Trigger` sets `asChild` internally and
  needs exactly one React element child that accepts a ref and spreads props — `Button`,
  `IconButton` and `Card` all qualify. Text or a fragment throws. The child should be a `<button>`:
  an `<a>` or a `<div>` cannot carry `aria-haspopup="menu"` honestly, and only a button announces as
  a menu pop-up.
- **It is uncontrolled until you control it.** Pass `open` and `onOpenChange` to own the state;
  otherwise `Root` keeps it. `onOpenChange` fires for every open and close, whatever caused it.
- **Render a `Trigger` even when `open` is what opens the menu.** A `Root` driven from elsewhere on
  the page — a shortcut, a guided tour — compiles and works without one, and then has nowhere to
  send focus when the panel closes: `Escape` leaves focus on `<body>`, which is the layer
  underneath rather than this package (Radix's own close-focus handler focuses its trigger and
  cancels the fallback whether or not it found one), and the reader's next `Tab` restarts at the
  top of the document. `Tab` out of the panel is covered — it falls back to whatever held focus
  when the panel opened — but that is one exit of several. Give the `Root` a real trigger and drive
  it *as well* from wherever you were going to; a visually hidden button is still a trigger.
- **`Root` holds open state — and that is the one thing in this system that does.** Every other
  `@pineappleui` package is a presentational shell that holds nothing. This one holds the panel's
  open state and nothing else, because the `Tab` behaviour below needs a way to close the menu that
  does not lie somewhere else in the event stream. It fetches nothing, reads no globals, and knows
  no product noun.
- **`Tab` closes the menu and moves focus onward.** This package implements the APG's requirement
  that Radix leaves out: `Tab` closes the panel and focuses the next tabbable element after the
  trigger, `Shift+Tab` the previous one. The destination is **computed**, because Radix and its
  focus trap both cancel the key and native sequential focus navigation is unreachable from inside
  the panel. Five limits of that scan, published so you can tell: **positive `tabindex` ordering is
  ignored** (document order among everything with `tabIndex >= 0`), **`inert` is ignored**, **shadow
  trees are not crossed**, **iframes are not entered**, and **CSS visibility is not read** — the
  scan tests a candidate's own `hidden` attribute, not its ancestors', so a control inside a
  `display: none` accordion or a `visibility: hidden` drawer is still a candidate. Where the scan
  and the browser disagree, focus is checked after the move and falls back to the trigger, which is
  also where it stays when you run off either end of the document.
- **`Content`'s `forceMount` costs you focus placement on close — ours and Radix's both.** The
  close-focus event fires only when the panel really unmounts, and a force-mounted panel never
  does. So a `Tab` out of one closes the menu and leaves focus inside the closed panel — and this is
  not a gap our patch opened: unpatched Radix parks focus on the closed panel's own viewport for
  `Escape` under `forceMount` too, for exactly the same reason. What our `Tab` patch adds is that
  it stops computing a destination it cannot place. Treat `forceMount` as an exit-animation hook
  for a menu that is dismissed by pointer, and not for one a keyboard reader leaves; a `Tab` and an
  `Escape` out of it are equally unplaced, in v1 and upstream.
- **`ArrowUp` on a closed trigger opens the menu at its last item.** The other APG requirement Radix
  leaves out. It is implemented by handing the question back to Radix's own last-enabled-item logic,
  so a disabled last item is skipped. One consequence worth knowing: a real `keydown` for `End` is
  dispatched on the panel to do it, and a consumer's own `Content.onKeyDown` will see it. Like
  `Enter`, `Space` and `ArrowDown`, it is refused when the `Trigger` is `disabled` — read off the
  prop rather than the DOM, which is what makes it hold for a trigger that stays focusable and
  carries its disabled state as `aria-disabled`.
- **`PageUp` and `PageDown` alias `Home` and `End`.** They jump to the first and last enabled item
  rather than paging a scrolled panel, which is Radix's behaviour and the APG's option. Worth
  knowing because a keyboard reader in a long menu expects paging and gets the ends.
- **What a screen reader should say.** The trigger reads as "*label*, menu pop-up, collapsed", and
  "expanded" once open. An item reads as "*label*, menu item, *n* of *m*" — the count comes from
  `role="menu"` and needs no markup from you. A `CheckboxItem` adds "checked" or "not checked" and
  "partially checked" for the mixed state; a `RadioItem` adds "selected"; a `SubTrigger` adds
  "submenu". A `Group` reads its `Label` only when you pair them by `id` (see Recipes), and a
  `Separator` is announced as a separator or skipped depending on the reader. If what you hear is
  materially different from that, the markup inside the panel is the thing to check first — this
  package announces nothing itself.
- **The panel portals to the end of `<body>` and carries no z-index.** Nothing in this system
  defines a layering scale — the panel wins on DOM order alone. Chrome with `position: fixed;
  z-index: 100` will paint over it: raise the panel with `className`/`style`, or pass `container` to
  put it inside your own stacking context. A real layering contract is a decision for when
  `Popover`, `Tooltip` and `Dialog` land together; three members is the minimum that makes an
  ordering mean anything.
- **A menu holds commands, not content.** No inputs, no arbitrary markup. An `<input>` inside
  `role="menu"` is invalid and unnavigable — the arrow keys move the highlight instead of the caret.
  Reach for a popover or a dialog.
- **`shortcut` is a label, not a binding.** It renders right-aligned and does nothing; you still
  have to bind the keystroke. It is also read out as part of the item's name, so a hint for a
  shortcut that does not exist is a lie in two places.
- **`color` takes an accent name, not a CSS colour.** Omit it to inherit the theme accent. A
  destructive item is `color="crimson"` and nothing else — no icon, no border, no inline
  confirmation.
- **Boolean props are Radix's names, not this repo's.** `open`, `disabled`, `modal`, `loop`,
  `checked`, `highContrast`, `avoidCollisions`, `hideWhenDetached` — none of them carry the
  `is`/`has`/`can`/`should` prefix the rest of the system uses. Renaming them would make this an
  adapter rather than a shell, and the boundary the names sit on is Radix's.
- **This is the first package here with event callbacks, and the convention is Radix's.**
  `onOpenChange`, `onSelect`, `onCheckedChange`, `onValueChange`.
- **Radix's `TriggerIcon` is deliberately not re-exported.** The system already owns a chevron:
  `<Icon name="chevron-down" size="sm" />` from `@pineappleui/icons`, at the system's own metrics
  and sizing vocabulary.
- **`loop` defaults to `true` here, against Radix's `false`.** A keyboard user who overshoots the
  end of a three-item menu should not have to arrow all the way back up it.
- **Reduced motion gets no animation at all**, because Radix's whole animation block sits inside
  `@media (prefers-reduced-motion: no-preference)`. Nothing to add, and nothing to "fix".
- **One menu open at a time.** Two `open`-controlled `Root`s can both be open; the behaviour is
  undefined and the answer is not to.

## Writing item labels

- Imperative verb first, sentence case: "Copy link", not "Link copying" or "Copy Link".
- A trailing `…` **only** when activating it opens a dialog asking for more input — "Rename…",
  "Export…". Users already read that convention from their OS; using it decoratively destroys the
  signal. It does **not** mean "opens a submenu": Radix already draws a chevron on a `SubTrigger`,
  and that row reads "Move to", with no ellipsis.
- No sentences, no full stops. A label that needs a clause to be understood means the menu is the
  wrong container.

## What the menu shows when there is nothing to offer

- Never render an item that is *always* disabled. Leave it out, or the menu becomes a list of things
  the reader cannot do. An item that is unavailable **right now** is different: leave it in and
  disable it, so the menu's shape does not shift under the reader.
- Never ship an empty panel. One disabled item reading "No actions available", or better, disable
  the trigger — a menu button that opens onto nothing is worse than a button you cannot press.
- Loading and failure are the same shape, and they are yours to compose: this package holds no data.
  A disabled "Loading…" row, or a disabled "Couldn’t load actions" beside a "Try again" that keeps
  the panel open with `onSelect={event => event.preventDefault()}`. The `UnavailableStates` story
  shows all four.

## Recipes

- **Match the trigger's width:** `style={{ minWidth: 'var(--radix-dropdown-menu-trigger-width)' }}`
  on `Content`. There is deliberately no prop for it.
- **Name a group:** `<Label id="x">` plus `<Group aria-labelledby="x">`. The pairing is manual, and
  it is the one accessibility gap the layer underneath leaves open.
- **Keep the panel open after a click:** `onSelect={event => event.preventDefault()}`. This is the
  only mechanism, and every checkbox or radio menu needs it.
- **A label too long for its row:** an item is a fixed-height flex row, so a label that wraps
  overflows it. Clip it — `style={{ overflow: 'hidden', textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' }}` on the item — give it a `title` for the pointer, and pass the whole string
  as `textValue` so typeahead still matches what the reader cannot see. Shorter labels are the real
  answer; this is what to do when the string is not yours.
- **A menu entry that navigates:** `<DropdownMenu.Item asChild><a href="…">…</a></DropdownMenu.Item>`,
  which keeps middle-click, open-in-new-tab and copy-link-address working. A whole `<nav>` of links
  is a different thing — `role="menu"` takes links out of a screen reader's links list, so use a
  disclosure button over a real `<nav>` instead.
- **Announce the result of an action** with your own `@pineappleui/live-region`. This package
  announces nothing on purpose: `role="menu"` plus real focus movement means every state change is
  already announced by the focus event, and a parallel live region would double-announce every arrow
  press. Only the consumer knows whether "Link copied" is true.
- **Touch:** an item is `--space-6` tall, which is below WCAG 2.5.8's AAA target. Raise `--scaling`
  on your `<Theme>` for a touch-primary surface rather than expecting a third size here. Submenus on
  touch are close to unusable, which is the concrete reason to avoid them.

## Licence

MIT © David Zhang
