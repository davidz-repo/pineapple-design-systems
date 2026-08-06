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

export function Sizes() {
  return (
    <div style={PANEL_STYLE}>
      {(['1', '2'] as const).map(size => (
        <DropdownMenu.Root key={size}>
          <ActionsTrigger label={`size ${size}`} />
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
          <ActionsTrigger label={variant} />
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
  const [format, setFormat] = useState('csv');

  return (
    <div style={PANEL_STYLE}>
      <DropdownMenu.Root>
        <ActionsTrigger label="Export as" />
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value={format} onValueChange={setFormat}>
            <DropdownMenu.RadioItem value="csv">CSV</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="json">JSON</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="pdf">PDF</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
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
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Move to…</DropdownMenu.SubTrigger>
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
        <ActionsTrigger label="Move to…" />
        <DropdownMenu.Content>
          {/* Deliberately too long, so the failure is visible in the gallery
              rather than discovered in production: an item is a fixed-height flex
              row, so a label that wraps overflows it. Keep labels short; if one
              must be long, clip it with `textOverflow` on the item and give
              `textValue` the whole string so typeahead still matches it. */}
          <DropdownMenu.Item textValue="Quarterly revenue reconciliation, EMEA, final">
            Quarterly revenue reconciliation, EMEA, final
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
          <ActionsTrigger label={`${side} / ${align}`} />
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
// "Controls" form and press the trigger to see the panel.
interface PlaygroundArgs {
  size: NonNullable<DropdownMenu.ContentProps['size']>;
  variant: NonNullable<DropdownMenu.ContentProps['variant']>;
  color: string;
  highContrast: boolean;
  side: NonNullable<DropdownMenu.ContentProps['side']>;
  align: NonNullable<DropdownMenu.ContentProps['align']>;
  loop: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ color, ...rest }) => (
  <div style={{ padding: 24 }}>
    <DropdownMenu.Root>
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
