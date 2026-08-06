import { useState } from 'react';

import { Button } from '@pineappleui/button';
import { Icon } from '@pineappleui/icons';
import { ACCENT_COLORS } from '@pineappleui/tokens';

import { DropdownMenu } from './DropdownMenu';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator and the docs site's example canvas both supply — `Content`
// reads `useThemeContext()` and THROWS without one.
//
// NOT ONE STORY OPENS ON LOAD. Under the default `modal`, an open panel
// scroll-locks the page, sets `pointer-events: none` on `<body>` and marks
// everything outside the portal `aria-hidden` — so a `defaultOpen` story would
// make the docs page around it inert while the reader is trying to use the
// controls beside it. Every story below is a trigger you press.
//
// ONE EXCEPTION, and it is deliberate: `Playground` passes `modal={false}`, and
// exposes it as a control. Every one of its args is a thing you can only see with
// the panel open, and under the default `modal` the reader's click on `variant` is
// spent dismissing the panel instead of changing it — worse for a screen-reader
// reader, who loses the args pane, the code block and the sidebar from the
// accessibility tree while the panel is up. Non-modal, the panel stays open across
// an arg change and redraws in place. The eleven Examples keep the default,
// because scroll-locked and page-inert is what this component does in production
// and showing that is their job; being tunable is the Playground's. A reader who
// flips the control to `true` feels the difference, which teaches the prop better
// than the sentence in its table row.
//
// The trigger is a real `@pineappleui/button` and the chevron a real
// `@pineappleui/icons` glyph, both story-only devDependencies here. Radix ships
// a `TriggerIcon` and this package deliberately does not re-export it: the system
// already owns a chevron, at the system's own metrics and sizing vocabulary, and
// two chevrons in one design system is one too many.

const PANEL_STYLE = { padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

function ActionsTrigger({ label = 'Actions' }: { label?: string }) {
  return (
    <DropdownMenu.Trigger>
      <Button variant="soft">
        {label}
        <Icon name="chevron-down" size="sm" />
      </Button>
    </DropdownMenu.Trigger>
  );
}

/** The four verbs every other story is built from. Imperative, sentence case. */
function StandardItems() {
  return (
    <>
      <DropdownMenu.Item>Copy link</DropdownMenu.Item>
      <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
      {/* The trailing ellipsis is a real signal, not decoration: it means
          activating this opens a dialog that asks for more input. */}
      <DropdownMenu.Item>Rename…</DropdownMenu.Item>
      <DropdownMenu.Item>Export as CSV</DropdownMenu.Item>
    </>
  );
}

// Trigger labels in the variant demos read like a real button — `Actions (soft)`,
// the form `icon-button`'s own variant demo set — rather than the bare enum value.
// A lower-cased code token in a real button on the docs canvas is the one place
// this package's own sentence-case rule would be broken by its own examples.
export function Sizes() {
  return (
    <div style={PANEL_STYLE}>
      {(['1', '2'] as const).map(size => (
        <DropdownMenu.Root key={size}>
          <ActionsTrigger label={`Actions (size ${size})`} />
          <DropdownMenu.Content size={size}>
            <StandardItems />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ))}
    </div>
  );
}

export function Variants() {
  return (
    <div style={PANEL_STYLE}>
      {(['solid', 'soft'] as const).map(variant => (
        <DropdownMenu.Root key={variant}>
          <ActionsTrigger label={`Actions (${variant})`} />
          <DropdownMenu.Content variant={variant}>
            <StandardItems />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ))}
    </div>
  );
}

export function WithIconsAndShortcuts() {
  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger />
        <DropdownMenu.Content>
          {/* An icon goes in `children`, not in a prop: the item is already a
              flex row with a gap, and the item's TEXT is its accessible name, so
              a decorative glyph beside it adds nothing to announce. */}
          <DropdownMenu.Item shortcut="⌘C">
            <Icon name="copy" size="sm" />
            Copy link
          </DropdownMenu.Item>
          <DropdownMenu.Item shortcut="⌘D">
            <Icon name="arrow-left-right" size="sm" />
            Duplicate
          </DropdownMenu.Item>
          {/* `shortcut` RENDERS and binds nothing. Both hints above describe
              keystrokes the consuming app still has to wire up itself — and both
              are read out as part of the item's name, so a hint for a shortcut
              that does not exist is a lie a screen reader repeats. */}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function WithGroupsAndLabels() {
  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger />
        <DropdownMenu.Content>
          {/* The `id`/`aria-labelledby` pairing is MANUAL, and it is the one
              accessibility gap the layer underneath leaves open: a bare `Label`
              is loose text inside an unnamed group. */}
          <DropdownMenu.Label id="menu-file">File</DropdownMenu.Label>
          <DropdownMenu.Group aria-labelledby="menu-file">
            <DropdownMenu.Item shortcut="⌘C">Copy link</DropdownMenu.Item>
            <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
          </DropdownMenu.Group>

          <DropdownMenu.Separator />

          <DropdownMenu.Label id="menu-share">Share</DropdownMenu.Label>
          <DropdownMenu.Group aria-labelledby="menu-share">
            <DropdownMenu.Item>Export as CSV</DropdownMenu.Item>
            <DropdownMenu.Item>Archive</DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function CheckboxItems() {
  const [showArchived, setShowArchived] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);

  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger label="View" />
        <DropdownMenu.Content>
          {/* `preventDefault()` in `onSelect` is the only way to keep the panel
              open, and every checkbox menu wants it: a reader ticking two boxes
              should not have to reopen the menu between them. */}
          <DropdownMenu.CheckboxItem
            checked={showArchived}
            onCheckedChange={setShowArchived}
            onSelect={(event) => {
              event.preventDefault();
            }}
          >
            Show archived
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={showDrafts}
            onCheckedChange={setShowDrafts}
            onSelect={(event) => {
              event.preventDefault();
            }}
          >
            Show drafts
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function RadioItems() {
  const [sortBy, setSortBy] = useState('name');

  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger label="Sort by" />
        <DropdownMenu.Content>
          {/* A persistent VIEW SETTING is the canonical menu radio group: it
              changes what the reader is looking at and it sticks. "Pick an export
              format" reads as a form value, and a form value belongs in a select
              — which is the boundary this whole package is drawn on. */}
          <DropdownMenu.RadioGroup value={sortBy} onValueChange={setSortBy}>
            <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="modified">Date modified</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function UnavailableStates() {
  return (
    <div style={PANEL_STYLE}>
      {/* Unavailable RIGHT NOW stays in the menu, disabled, so its shape does
          not shift under the reader. Unavailable ALWAYS should not be here. */}
      <DropdownMenu.Root>
        <ActionsTrigger label="Actions (one unavailable)" />
        <DropdownMenu.Content>
          <DropdownMenu.Item>Copy link</DropdownMenu.Item>
          <DropdownMenu.Item disabled>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item>Rename…</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Never an empty `role="menu"`: an open box with nothing in it reads as
          broken, and zero `menuitem`s is a dead end for a screen reader.
          Better still, disable the trigger when there is nothing to offer. */}
      <DropdownMenu.Root>
        <ActionsTrigger label="Actions (nothing to offer)" />
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>No actions available</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Loading and error are the consumer's to compose, out of the same
          disabled item — this package holds no data. The panel keeps the width
          it will have, so it does not jump when the real items land. */}
      <DropdownMenu.Root>
        <ActionsTrigger label="Actions (loading)" />
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>Loading…</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <ActionsTrigger label="Actions (failed)" />
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled>Couldn’t load actions</DropdownMenu.Item>
          <DropdownMenu.Separator />
          {/* preventDefault keeps the panel open, so the retry lands in place. */}
          <DropdownMenu.Item onSelect={event => event.preventDefault()}>
            Try again
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function DestructiveItem() {
  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger />
        <DropdownMenu.Content>
          <StandardItems />
          <DropdownMenu.Separator />
          {/* A destructive item is an accent and nothing else — no icon, no
              border, no inline confirmation. A menu closes on activation, so a
              destructive action either confirms in a dialog afterwards or is
              undoable, and both of those are the consumer's call. */}
          <DropdownMenu.Item color="crimson">Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function WithSubmenu() {
  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger />
        <DropdownMenu.Content>
          <DropdownMenu.Item shortcut="⌘C">Copy link</DropdownMenu.Item>
          {/* One level, and no more: a submenu opens on hover with no focus move
              and on ArrowRight with one, which is fine with a pointer or a
              keyboard and close to unusable on a touch screen. Three levels deep
              is unhittable. */}
          {/* `Move to`, with no ellipsis: the trailing `…` is reserved for "opens
              a dialog asking for more input", and Radix already draws a chevron on
              a sub-trigger. Two contradictory signals on one row is worse than
              either. */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Move to</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item>Inbox</DropdownMenu.Item>
              <DropdownMenu.Item>Archive</DropdownMenu.Item>
              <DropdownMenu.Item>Starred</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />
          <DropdownMenu.Item color="crimson">Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function LongList() {
  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger label="Move to" />
        <DropdownMenu.Content>
          {/* The failure and its remedy, side by side. First, deliberately too
              long, so the overflow is visible in the gallery rather than
              discovered in production: an item is a fixed-height flex row, so a
              label that wraps overflows it. No `textValue` here — Radix falls back
              to the rendered text, so restating the same string would be a no-op
              dressed up as configuration. */}
          <DropdownMenu.Item>
            Quarterly revenue reconciliation, EMEA, final
          </DropdownMenu.Item>
          {/* Then the remedy from the README's Recipes: clip it, give the pointer
              a `title`, and pass the whole string as `textValue` so typeahead
              still matches what the reader cannot see. The DOM text is the same
              either way — what the clip changes is how much of it is visible, and
              `textValue` is what keeps the hidden tail matchable. */}
          <DropdownMenu.Item
            title="Quarterly revenue reconciliation, APAC, final"
            textValue="Quarterly revenue reconciliation, APAC, final"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            Quarterly revenue reconciliation, APAC, final
          </DropdownMenu.Item>
          {Array.from({ length: 24 }, (_, index) => `Project ${index + 1}`).map(label => (
            <DropdownMenu.Item key={label}>{label}</DropdownMenu.Item>
          ))}
          {/* Above about fifteen items the design answer is groups and
              separators, or a different component altogether — the scroll below
              is a floor, not a feature. */}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

export function AlignmentAndSide() {
  const placements = [
    { side: 'bottom', align: 'start' },
    { side: 'bottom', align: 'end' },
    { side: 'top', align: 'start' },
    { side: 'right', align: 'start' },
  ] as const;

  return (
    <div style={{ ...PANEL_STYLE, paddingTop: 120, paddingBottom: 120 }}>
      {placements.map(({ side, align }) => (
        <DropdownMenu.Root key={`${side}-${align}`}>
          <ActionsTrigger label={`Actions (${side} / ${align})`} />
          {/* The panel may still FLIP to the opposite side when there is no room;
              `data-side` on it reports where it actually landed, which is what
              the open animation reads. */}
          <DropdownMenu.Content side={side} align={align}>
            <StandardItems />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      ))}
    </div>
  );
}

export function InsideAScrollContainer() {
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          height: 160,
          width: 320,
          overflow: 'auto',
          border: '1px solid var(--gray-a6)',
          borderRadius: 'var(--radius-3)',
          padding: 12,
        }}
      >
        <div style={{ height: 80 }} />
        <DropdownMenu.Root>
          <ActionsTrigger />
          {/* The panel portals to the end of `<body>`, so this scroller's
              `overflow` cannot clip it — that is the whole reason for the portal.
              What a scroller CAN do is carry the trigger away from underneath its
              own open panel, which is what `hideWhenDetached` answers. */}
          <DropdownMenu.Content hideWhenDetached>
            <StandardItems />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <div style={{ height: 400 }} />
      </div>
    </div>
  );
}

// Interactive playground: change size/variant/colour/placement from the
// "Controls" form and press the trigger to see the panel. `modal` is a control of
// its own here, defaulting to `false` — see the exception at the top of this file
// for why this one story is not modal, and flip it to `true` to feel what the
// default does to the page around it.
interface PlaygroundArgs {
  size: NonNullable<DropdownMenu.ContentProps['size']>;
  variant: NonNullable<DropdownMenu.ContentProps['variant']>;
  color: string;
  highContrast: boolean;
  side: NonNullable<DropdownMenu.ContentProps['side']>;
  align: NonNullable<DropdownMenu.ContentProps['align']>;
  loop: boolean;
  modal: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ color, modal, ...rest }) => (
  <div style={{ padding: 24 }}>
    <DropdownMenu.Root modal={modal}>
      <ActionsTrigger />
      <DropdownMenu.Content
        {...rest}
        color={(color || undefined) as DropdownMenu.ContentProps['color']}
      >
        <StandardItems />
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="crimson">Delete</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
);

Playground.args = {
  highContrast: false,
  loop: true,
  modal: false,
};

Playground.argTypes = {
  size: {
    options: ['1', '2'],
    control: { type: 'select' },
    defaultValue: '2',
  },
  variant: {
    options: ['solid', 'soft'],
    control: { type: 'select' },
    defaultValue: 'solid',
  },
  // '' is "inherit the theme accent"; 'gray' is Radix's neutral scale, which is
  // not an accent and so is not in ACCENT_COLORS. The accents themselves are
  // read from @pineappleui/tokens rather than retyped — a hand-written copy of
  // that list is what shipped a picker missing one upstream.
  color: {
    options: ['', 'gray', ...ACCENT_COLORS],
    control: { type: 'select' },
    defaultValue: '',
  },
  side: {
    options: ['top', 'right', 'bottom', 'left'],
    control: { type: 'select' },
    defaultValue: 'bottom',
  },
  align: {
    options: ['start', 'center', 'end'],
    control: { type: 'select' },
    defaultValue: 'start',
  },
};
