import type { ReactNode } from 'react';
import { act, useState } from 'react';

import { DropdownMenu as RadixDropdownMenu, Theme } from '@radix-ui/themes';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DropdownMenu } from './index';

// `Content` calls Radix's `useThemeContext()`, which THROWS outside a `<Theme>`
// rather than merely rendering unstyled — so every render here goes through this
// helper. The gallery and the docs site both already provide one.
function renderMenu(ui: ReactNode) {
  return render(<Theme>{ui}</Theme>);
}

// Real verbs, four of them, chosen so the typeahead assertions are unambiguous:
// two items start with `d`, and only one of those continues `de`.
const ACTIONS = ['Copy link', 'Duplicate', 'Export as CSV', 'Delete'] as const;

function ActionsMenu({
  disabled = [],
  onSelect,
  contentProps,
  ...rootProps
}: DropdownMenu.RootProps & {
  disabled?: readonly string[];
  onSelect?: (event: Event) => void;
  contentProps?: DropdownMenu.ContentProps;
}) {
  return (
    <DropdownMenu.Root {...rootProps}>
      <DropdownMenu.Trigger>
        <button type="button">Actions</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content {...contentProps}>
        {ACTIONS.map(label => (
          <DropdownMenu.Item
            key={label}
            disabled={disabled.includes(label)}
            onSelect={onSelect}
          >
            {label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

// `hidden: true` on every button lookup, deliberately: under the default
// `modal`, Radix hides everything outside the portal from assistive technology
// (`aria-hidden` on the panel's siblings) while the menu is open — so the
// trigger and the page's other controls are correctly ABSENT from the
// accessibility tree, and a default `getByRole` cannot see them. That is the
// behaviour, not a test problem, and it is why no story opens on load.
function button(name: string) {
  return screen.getByRole('button', { name, hidden: true });
}

function trigger() {
  return button('Actions');
}

function item(name: string) {
  return screen.getByRole('menuitem', { name });
}

/** A menu whose panel is portalled into a local element rather than `<body>`. */
function MenuInHost() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div data-testid="host" ref={setHost} />
      {host !== null && <ActionsMenu defaultOpen contentProps={{ container: host }} />}
    </>
  );
}

/**
 * `document.activeElement`, waited for — arrow, Home/End and typeahead focus
 * moves all land inside a `setTimeout`, in `RovingFocusGroupItem` and in
 * `handleTypeaheadSearch` respectively. Only the content-level first/last branch
 * (where the key lands on the panel itself) is synchronous.
 */
async function expectFocus(element: Element) {
  await waitFor(() => {
    expect(document.activeElement).toBe(element);
  });
}

/**
 * One macrotask, so `DismissableLayer` has attached its outside-pointerdown
 * listener. It adds it inside a `setTimeout(0)` on purpose — otherwise the very
 * pointerdown that opened the menu would be the one that dismissed it — so a
 * synthetic press fired in the same tick as the render lands on nothing.
 */
async function settleOutsideListeners() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

// ---------------------------------------------------------------------------
// PREMISE TESTS — written and run BEFORE either patch existed (step 6 of the
// build order). Each asserts what UNPATCHED Radix does today, imported straight
// from `@radix-ui/themes` rather than through this package, so each fails the day
// upstream starts handling the key itself and double-handles it with us. The fix
// is in the failure message.
// ---------------------------------------------------------------------------
describe('the Radix behaviour the two patches stand on', () => {
  it('does not open on ArrowUp at the closed trigger', () => {
    renderMenu(
      <RadixDropdownMenu.Root>
        <RadixDropdownMenu.Trigger>
          <button type="button">Actions</button>
        </RadixDropdownMenu.Trigger>
        <RadixDropdownMenu.Content>
          <RadixDropdownMenu.Item>Copy link</RadixDropdownMenu.Item>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Root>,
    );
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    expect(
      screen.queryByRole('menu'),
      'Radix now opens the menu on ArrowUp at the trigger. Delete the ArrowUp branch from '
      + 'Trigger.onKeyDown and the openIntentRef plumbing in DropdownMenu.tsx: upstream owns '
      + 'this now, and both of us handling it double-handles the key.',
    ).toBeNull();
  });

  it('swallows Tab inside the open panel', () => {
    renderMenu(
      <RadixDropdownMenu.Root defaultOpen>
        <RadixDropdownMenu.Trigger>
          <button type="button">Actions</button>
        </RadixDropdownMenu.Trigger>
        <RadixDropdownMenu.Content>
          <RadixDropdownMenu.Item>Copy link</RadixDropdownMenu.Item>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Root>,
    );
    const panel = screen.getByRole('menu');
    const focusedBefore = document.activeElement;
    // `fireEvent` returns false when a handler called `preventDefault()`, which is
    // the observable half; the panel still being there is the other.
    const notPrevented = fireEvent.keyDown(item('Copy link'), { key: 'Tab' });

    expect(
      notPrevented,
      'Radix no longer preventDefaults Tab inside the panel. Delete the Tab branch from '
      + 'Content.onKeyDown, the pendingTabRef and the Tab arm of Content.onCloseAutoFocus in '
      + 'DropdownMenu.tsx, and src/nextTabbable.ts with them: native sequential focus '
      + 'navigation is reachable again, and computing a destination ourselves would fight it.',
    ).toBe(false);
    expect(screen.queryByRole('menu')).toBe(panel);
    expect(document.activeElement).toBe(focusedBefore);
  });
});

describe('@pineappleui/dropdown-menu structure and ARIA', () => {
  it('renders the trigger and no menu at all while closed', () => {
    renderMenu(<ActionsMenu />);
    expect(trigger()).not.toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('marks the closed trigger as a collapsed menu pop-up controlling nothing', () => {
    renderMenu(<ActionsMenu />);
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-controls')).toBeNull();
  });

  it('points the open trigger at the panel it opened', () => {
    renderMenu(<ActionsMenu defaultOpen />);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(screen.getByRole('menu').id);
  });

  it('labels the panel with the trigger', () => {
    renderMenu(<ActionsMenu defaultOpen />);
    expect(screen.getByRole('menu').getAttribute('aria-labelledby')).toBe(trigger().id);
  });

  it('gives each kind of item the role and checked state its pattern requires', () => {
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Copy link</DropdownMenu.Item>
          <DropdownMenu.CheckboxItem checked>Show archived</DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem checked="indeterminate">Show drafts</DropdownMenu.CheckboxItem>
          <DropdownMenu.RadioGroup value="csv">
            <DropdownMenu.RadioItem value="csv">CSV</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="json">JSON</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );

    expect(item('Copy link').getAttribute('role')).toBe('menuitem');

    const checked = screen.getByRole('menuitemcheckbox', { name: 'Show archived' });
    expect(checked.getAttribute('aria-checked')).toBe('true');
    const mixed = screen.getByRole('menuitemcheckbox', { name: 'Show drafts' });
    expect(mixed.getAttribute('aria-checked')).toBe('mixed');

    expect(screen.getByRole('menuitemradio', { name: 'CSV' }).getAttribute('aria-checked'))
      .toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'JSON' }).getAttribute('aria-checked'))
      .toBe('false');
  });

  it('renders a separator and a group with the roles a screen reader navigates by', () => {
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Item>Copy link</DropdownMenu.Item>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    const separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
    expect(screen.getByRole('group')).not.toBeNull();
  });

  // The one real a11y gap the layer underneath leaves open: `Label` renders bare
  // text with no `id` and no link to the group beside it, so the pairing is the
  // consumer's to write. This pins the pattern the README documents.
  it('names a group from the label beside it, when they are paired by id', () => {
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label id="menu-file">File</DropdownMenu.Label>
          <DropdownMenu.Group aria-labelledby="menu-file">
            <DropdownMenu.Item>Copy link</DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    expect(screen.getByRole('group', { name: 'File' })).not.toBeNull();
  });

  it('leaves a disabled item in the tree, marked disabled rather than removed', () => {
    renderMenu(<ActionsMenu defaultOpen disabled={['Duplicate']} />);
    const duplicate = item('Duplicate');
    expect(duplicate.getAttribute('aria-disabled')).toBe('true');
    expect(duplicate.hasAttribute('data-disabled')).toBe(true);
  });
});

describe('@pineappleui/dropdown-menu opening, closing and focus return', () => {
  it('opens on a primary pointer press and not on a ctrl-click', () => {
    renderMenu(<ActionsMenu />);
    fireEvent.pointerDown(trigger(), { button: 0, ctrlKey: true });
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.pointerDown(trigger(), { button: 0, ctrlKey: false });
    expect(screen.getByRole('menu')).not.toBeNull();
  });

  it('opens on Enter with the first enabled item focused', async () => {
    renderMenu(<ActionsMenu />);
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    await expectFocus(item('Copy link'));
  });

  it('opens on ArrowDown with the first enabled item focused', async () => {
    renderMenu(<ActionsMenu disabled={['Copy link']} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    await expectFocus(item('Duplicate'));
  });

  // PATCH 1 — the rewritten spec item 12. Radix ignores ArrowUp at the trigger;
  // the APG opens to the LAST item. The disabled `Delete` is what proves the
  // patch hands the question back to Radix's own enabled-item collection instead
  // of re-deriving "last".
  it('opens on ArrowUp with the LAST enabled item focused', async () => {
    renderMenu(<ActionsMenu disabled={['Delete']} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    expect(screen.getByRole('menu')).not.toBeNull();
    await expectFocus(item('Export as CSV'));
  });

  it('does not carry an ArrowUp intent into the next pointer open', async () => {
    renderMenu(<ActionsMenu open={false} onOpenChange={() => {}} />);
    // A controlled Root that refuses to open is the one path where the recorded
    // intent outlives the keypress.
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    fireEvent.pointerDown(trigger(), { button: 0, ctrlKey: false });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and puts focus back on the trigger', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(trigger());
  });

  it('closes on a press outside and puts focus back on the trigger', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    await settleOutsideListeners();
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(trigger());
  });

  it('fires onSelect once, closes, and puts focus back on the trigger', async () => {
    const onSelect = vi.fn();
    renderMenu(<ActionsMenu defaultOpen onSelect={onSelect} />);
    fireEvent.click(item('Copy link'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(trigger());
  });

  it('keeps the panel open, and focus on the item, when onSelect prevents the default', async () => {
    renderMenu(
      <ActionsMenu
        onSelect={(event) => {
          event.preventDefault();
        }}
      />,
    );
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    await expectFocus(item('Copy link'));

    fireEvent.keyDown(item('Copy link'), { key: 'Enter' });
    expect(screen.getByRole('menu')).not.toBeNull();
    expect(document.activeElement).toBe(item('Copy link'));
  });

  it('honours defaultOpen on mount, and a controlled open={false} against the trigger', () => {
    const onOpenChange = vi.fn();
    const { unmount } = renderMenu(<ActionsMenu defaultOpen />);
    expect(screen.getByRole('menu')).not.toBeNull();
    unmount();

    renderMenu(<ActionsMenu open={false} onOpenChange={onOpenChange} />);
    fireEvent.pointerDown(trigger(), { button: 0, ctrlKey: false });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('keeps the panel open when onEscapeKeyDown prevents the default', () => {
    renderMenu(
      <ActionsMenu
        defaultOpen
        contentProps={{
          onEscapeKeyDown: (event) => {
            event.preventDefault();
          },
        }}
      />,
    );
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.getByRole('menu')).not.toBeNull();
  });
});

describe('@pineappleui/dropdown-menu keyboard navigation', () => {
  it('walks down and back up the items with the arrow keys', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await expectFocus(item('Copy link'));

    fireEvent.keyDown(item('Copy link'), { key: 'ArrowDown' });
    await expectFocus(item('Duplicate'));

    fireEvent.keyDown(item('Duplicate'), { key: 'ArrowDown' });
    await expectFocus(item('Export as CSV'));

    fireEvent.keyDown(item('Export as CSV'), { key: 'ArrowUp' });
    await expectFocus(item('Duplicate'));
  });

  it('steps over a disabled item in the middle', async () => {
    renderMenu(<ActionsMenu defaultOpen disabled={['Duplicate']} />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await expectFocus(item('Copy link'));

    fireEvent.keyDown(item('Copy link'), { key: 'ArrowDown' });
    await expectFocus(item('Export as CSV'));
  });

  // `loop` defaults to `true` here against Radix's `false`. This test fails if
  // that default is ever dropped, which is the point of it.
  it('wraps from the last item round to the first', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    await expectFocus(item('Delete'));

    fireEvent.keyDown(item('Delete'), { key: 'ArrowDown' });
    await expectFocus(item('Copy link'));
  });

  it('jumps to the first and last item with Home and End, and aliases PageUp/PageDown', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    await expectFocus(item('Delete'));

    fireEvent.keyDown(item('Delete'), { key: 'Home' });
    await expectFocus(item('Copy link'));

    // PageUp and PageDown do NOT page — they alias first and last. Pinned
    // because it is the kind of quirk a reader would otherwise discover by
    // pressing it.
    fireEvent.keyDown(item('Copy link'), { key: 'PageDown' });
    await expectFocus(item('Delete'));

    fireEvent.keyDown(item('Delete'), { key: 'PageUp' });
    await expectFocus(item('Copy link'));
  });

  it('jumps to an item by typing its first letters, skipping a disabled match', async () => {
    const { unmount } = renderMenu(<ActionsMenu defaultOpen />);
    const panel = screen.getByRole('menu');
    fireEvent.keyDown(panel, { key: 'd' });
    await expectFocus(item('Duplicate'));

    fireEvent.keyDown(item('Duplicate'), { key: 'e' });
    await expectFocus(item('Delete'));
    unmount();

    renderMenu(<ActionsMenu defaultOpen disabled={['Duplicate']} />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'd' });
    await expectFocus(item('Delete'));
  });

  it('forgets the typeahead buffer after a second of no keypress', async () => {
    // `shouldAdvanceTime` keeps the 0ms focus timeouts inside Radix running while
    // the 1000ms buffer timer is under this test's control.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderMenu(<ActionsMenu defaultOpen />);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'd' });
      await expectFocus(item('Duplicate'));

      await vi.advanceTimersByTimeAsync(1100);

      // With the buffer intact this would read as `de` and land on Delete. Reset,
      // it reads as a fresh `e` and lands on the next item starting with one.
      fireEvent.keyDown(item('Duplicate'), { key: 'e' });
      await expectFocus(item('Export as CSV'));
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('types a space into the typeahead buffer instead of activating the item', async () => {
    const onSelect = vi.fn();
    renderMenu(<ActionsMenu defaultOpen onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'd' });
    await expectFocus(item('Duplicate'));

    fireEvent.keyDown(item('Duplicate'), { key: ' ' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).not.toBeNull();
  });

  it('toggles a checkbox item on Enter', () => {
    const onCheckedChange = vi.fn();
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    fireEvent.keyDown(
      screen.getByRole('menuitemcheckbox', { name: 'Show archived' }),
      { key: 'Enter' },
    );
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH 2 — the rewritten spec item 23, plus the two double-handling detectors
// Decision 4 of the build brief asks for.
// ---------------------------------------------------------------------------
describe('@pineappleui/dropdown-menu Tab handling', () => {
  function renderMenuBetweenButtons(props: DropdownMenu.RootProps = {}) {
    renderMenu(
      <>
        <button type="button">Before</button>
        <ActionsMenu defaultOpen {...props} />
        <button type="button">After</button>
      </>,
    );
    return {
      before: button('Before'),
      after: button('After'),
    };
  }

  it('closes on Tab and moves focus to the next tabbable element after the trigger', async () => {
    const { after } = renderMenuBetweenButtons();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(after);
  });

  it('closes on Shift+Tab and moves focus to the previous tabbable element', async () => {
    const { before } = renderMenuBetweenButtons();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab', shiftKey: true });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(before);
  });

  it('closes exactly once on Tab', async () => {
    const onOpenChange = vi.fn();
    renderMenuBetweenButtons({ onOpenChange });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    expect(
      onOpenChange.mock.calls,
      'onOpenChange fired more than once for one Tab, which means Radix is now closing the '
      + 'panel as well. Drop the setOpen(false) from the Tab branch of Content.onKeyDown in '
      + 'DropdownMenu.tsx and let upstream own it.',
    ).toEqual([[false]]);
  });

  it('places focus itself on Tab rather than letting Radix restore the trigger', async () => {
    const { after } = renderMenuBetweenButtons();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    await expectFocus(after);
    expect(
      document.activeElement,
      'focus came back to the trigger on a Tab close, which means Radix\'s own '
      + 'onCloseAutoFocus trigger-refocus ran despite our preventDefault(). Check the handler '
      + 'order in Content.onCloseAutoFocus in DropdownMenu.tsx.',
    ).not.toBe(trigger());
  });

  it('keeps focus on the trigger when there is nowhere further to tab', async () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
    });
    await expectFocus(trigger());
  });

  it('ignores Ctrl+Tab, which belongs to the window rather than the menu', () => {
    renderMenu(<ActionsMenu defaultOpen />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab', ctrlKey: true });
    expect(screen.getByRole('menu')).not.toBeNull();
  });
});

describe('@pineappleui/dropdown-menu submenus', () => {
  function renderWithSubmenu() {
    renderMenu(
      <>
        <button type="button">Before</button>
        <DropdownMenu.Root defaultOpen>
          <DropdownMenu.Trigger>
            <button type="button">Actions</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item>Copy link</DropdownMenu.Item>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>Move to…</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item>Inbox</DropdownMenu.Item>
                <DropdownMenu.Item>Archive</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <button type="button">After</button>
      </>,
    );
    return screen.getByRole('menuitem', { name: 'Move to…' });
  }

  it('opens a submenu on ArrowRight with its first item focused', async () => {
    const subTrigger = renderWithSubmenu();
    fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });
    await expectFocus(item('Inbox'));
  });

  it('closes a submenu on ArrowLeft and returns focus to its sub-trigger', async () => {
    const subTrigger = renderWithSubmenu();
    fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });
    await expectFocus(item('Inbox'));

    fireEvent.keyDown(item('Inbox'), { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Inbox' })).toBeNull();
    });
    await expectFocus(subTrigger);
    expect(screen.getByRole('menu')).not.toBeNull();
  });

  // Radix closes the WHOLE tree here where the APG closes only the submenu.
  // Pinned so a change upstream is visible rather than surprising.
  it('closes the whole tree on Escape inside a submenu, back to the root trigger', async () => {
    const subTrigger = renderWithSubmenu();
    fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });
    await expectFocus(item('Inbox'));

    fireEvent.keyDown(item('Inbox'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryAllByRole('menu')).toEqual([]);
    });
    await expectFocus(trigger());
  });

  it('marks an open sub-trigger as expanded and points it at the sub-panel', async () => {
    const subTrigger = renderWithSubmenu();
    fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });
    await expectFocus(item('Inbox'));

    expect(subTrigger.getAttribute('data-state')).toBe('open');
    expect(subTrigger.getAttribute('aria-expanded')).toBe('true');
    const panels = screen.getAllByRole('menu');
    const subPanel = panels.find(panel => panel.id === subTrigger.getAttribute('aria-controls'));
    expect(subPanel).not.toBeUndefined();
  });

  // Not probed before this test existed: React bubbles a portalled event to its
  // React ancestors, so the ROOT Content's handler should see a Tab pressed
  // inside a submenu. If this ever fails, SubContent needs the same handler.
  it('closes the whole tree on Tab inside a submenu and moves focus onward', async () => {
    const subTrigger = renderWithSubmenu();
    fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });
    await expectFocus(item('Inbox'));

    fireEvent.keyDown(item('Inbox'), { key: 'Tab' });
    await waitFor(() => {
      expect(screen.queryAllByRole('menu')).toEqual([]);
    });
    await expectFocus(button('After'));
  });
});

describe('@pineappleui/dropdown-menu pass-through', () => {
  // Every assertion below is written against a value that is NOT Radix's own
  // default — size 1 against '2', soft against 'solid' — so a wrapper that
  // dropped the prop on the floor would fail rather than pass by coincidence.
  it('passes size through to Radix', () => {
    renderMenu(<ActionsMenu defaultOpen contentProps={{ size: '1' }} />);
    expect(screen.getByRole('menu').className).toMatch(/rt-r-size-1/);
  });

  it('passes variant through to Radix', () => {
    renderMenu(<ActionsMenu defaultOpen contentProps={{ variant: 'soft' }} />);
    expect(screen.getByRole('menu').className).toMatch(/rt-variant-soft/);
  });

  it('passes highContrast through to Radix', () => {
    renderMenu(<ActionsMenu defaultOpen contentProps={{ highContrast: true }} />);
    expect(screen.getByRole('menu').className).toMatch(/rt-high-contrast/);
  });

  it('passes an item colour through as its accent attribute', () => {
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item color="crimson">Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    expect(item('Delete').getAttribute('data-accent-color')).toBe('crimson');
  });

  it('renders a shortcut inside the item it belongs to', () => {
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item shortcut="⌘C">Copy link</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    const shortcut = screen.getByText('⌘C');
    expect(shortcut.className).toMatch(/rt-BaseMenuShortcut/);
    expect(shortcut.closest('[role="menuitem"]')).not.toBeNull();
  });

  // Attributes, never pixels: `getBoundingClientRect()` returns zeros in jsdom,
  // so floating-ui puts everything at the origin and a position assertion would
  // be asserting the shim.
  it('passes side and align through as the attributes the panel reports', () => {
    renderMenu(
      <ActionsMenu
        defaultOpen
        contentProps={{ side: 'top', align: 'end', avoidCollisions: false }}
      />,
    );
    const panel = screen.getByRole('menu');
    expect(panel.getAttribute('data-side')).toBe('top');
    expect(panel.getAttribute('data-align')).toBe('end');
  });

  it('renders the panel into the container it is given', () => {
    renderMenu(<MenuInHost />);
    expect(screen.getByTestId('host').contains(screen.getByRole('menu'))).toBe(true);
  });
});

describe('@pineappleui/dropdown-menu refs', () => {
  it('forwards refs to the underlying trigger element', () => {
    let received: HTMLButtonElement | null = null;
    renderMenu(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger ref={(el) => {
          received = el;
        }}
        >
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Copy link</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    // The button the consumer supplied, not a wrapper: `Trigger` sets `asChild`
    // internally, and this ref is composed with the one the Tab patch keeps.
    expect(received).toBeInstanceOf(HTMLButtonElement);
  });

  it('forwards refs to the underlying menu element', () => {
    let received: HTMLDivElement | null = null;
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content ref={(el) => {
          received = el;
        }}
        >
          <DropdownMenu.Item>Copy link</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    expect(received).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards refs to the underlying item element', () => {
    let received: HTMLDivElement | null = null;
    renderMenu(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>
          <button type="button">Actions</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item ref={(el) => {
            received = el;
          }}
          >
            Copy link
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    expect(received).toBeInstanceOf(HTMLDivElement);
  });
});
