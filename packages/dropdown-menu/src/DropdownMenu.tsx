import type { ComponentPropsWithRef, Ref, RefCallback, RefObject } from 'react';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DropdownMenu as RadixDropdownMenu } from '@radix-ui/themes';

import { focusNextTabbableFrom } from './nextTabbable';

import type { TabDirection } from './nextTabbable';

// The WAI-ARIA menu-button pattern over `@radix-ui/themes`' `DropdownMenu`.
//
// ---------------------------------------------------------------------------
// WHY THIS PACKAGE HOLDS STATE, WHEN NO OTHER ONE HERE DOES
// ---------------------------------------------------------------------------
//
// `docs/plan.md` principle 1 says a package here takes props in and emits
// callbacks out. That principle is REWRITTEN for this package, deliberately and
// by the user's decision: `Root` owns the panel's open state and nothing else.
//
// It is the price of the `Tab` patch below. The APG requires `Tab` to close the
// menu and move focus onward; Radix `preventDefault()`s the key. Closing from
// our own key handler needs a way to close, and every route that does not own
// the state lies somewhere in the event stream — a synthetic `Escape` fires app
// level Escape handlers we cannot suppress, a synthetic outside-pointerdown
// fires `onPointerDownOutside` and `onInteractOutside`, and a hidden closing
// `Item` pollutes the item collection, the arrow-key order and the "1 of n" a
// screen reader reads out. Radix's private hatches (`onDismiss`, `trapFocus`,
// `onOpenAutoFocus`) are deliberately not in the public type here.
//
// A reviewer who flags the statefulness gets this comment, not a refactor. Do
// not "simplify" `Root` back to stateless: the `Tab` patch goes with it.
//
// `Root` holds one more thing for the same reason: the PENDING REQUEST (see
// `MenuRequest`). Both patches record what a keystroke asked for and act on it
// later, once the panel has opened or closed — and a request that is only ever
// held in a ref outlives the keystroke that made it, because a `Root` whose
// consumer refuses to open or close renders for nothing and so nothing ever
// observes the refusal. Scoping the request to the transition it asked for is
// what keeps `Escape` returning focus to the trigger after a refused `Tab`, and
// keeps a pointer open from inheriting a refused `ArrowUp`'s "land on the last
// item".
//
// One side effect worth knowing: because `Root` now ALWAYS hands Radix an `open`
// prop, Radix's own uncontrolled-to-controlled development warning can never
// fire. A consumer who switches a `Root` between controlled and uncontrolled
// mid-life gets our behaviour change silently where they used to get a console
// warning.
//
// ---------------------------------------------------------------------------
// WHY EVERY MEMBER IS A PLAIN `function`, AND NEVER `React.FC`
// ---------------------------------------------------------------------------
//
// `@types/react@19`'s `FunctionComponent` returns `ReactNode |
// Promise<ReactNode>`, and the docs site's prop extractor
// (`apps/site/scripts/extract-props.mjs`) only counts an export as a component
// when a call signature returns something assignable to `ReactNode` — which
// that union is not. Radix declares `Root` and `Sub` as `React.FC`, so a bare
// re-export of its namespace documents 12 of 14 members and silently drops
// `open` / `defaultOpen` / `onOpenChange` / `modal` / `dir` off the page. Plain
// function declarations are what put those five rows back.
//
// ---------------------------------------------------------------------------
// WHY THE PROPS ARE RESTATED
// ---------------------------------------------------------------------------
//
// Each member's props type is an INTERSECTION of Radix's own with a local type
// literal that re-declares each prop purely to hang a sentence on it — the
// pattern `box`, `stack`, `inline`, `badge`, `text`, `heading` and `card` all
// use. Radix ships no JSDoc on most of these, and the docs site builds its
// tables from these types, so without the sentences the most complex component
// in the system has 64 blank cells in its Description column.
//
// Never `interface XProps extends Omit<RadixXProps, …>`: that ships TS2430 to
// consumers compiling with the default `skipLibCheck: false`, which is what
// `scripts/check-dts-strict.mjs` exists to catch. The restatement is CHECKED
// rather than trusted — each `RadixItemProps['color']` is an indexed access, so
// a prop Radix renames or drops is a build error here rather than a stale row.

type RadixTriggerProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Trigger>;
type RadixContentProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Content>;
type RadixLabelProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Label>;
type RadixGroupProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Group>;
type RadixItemProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Item>;
type RadixCheckboxItemProps = ComponentPropsWithRef<typeof RadixDropdownMenu.CheckboxItem>;
type RadixRadioGroupProps = ComponentPropsWithRef<typeof RadixDropdownMenu.RadioGroup>;
type RadixRadioItemProps = ComponentPropsWithRef<typeof RadixDropdownMenu.RadioItem>;
type RadixSeparatorProps = ComponentPropsWithRef<typeof RadixDropdownMenu.Separator>;
type RadixSubTriggerProps = ComponentPropsWithRef<typeof RadixDropdownMenu.SubTrigger>;
type RadixSubContentProps = ComponentPropsWithRef<typeof RadixDropdownMenu.SubContent>;

/**
 * What a keystroke asked the panel to do, held from the keystroke until the
 * panel gets there. Both patches need one: `ArrowUp` has to say "land on the
 * last item" before the panel that will do it exists, and `Tab` has to say
 * "focus was leaving, this way" before the panel that holds focus is gone.
 *
 * `wantsOpen` is what makes a request CHECKABLE, and it is why this is a request
 * rather than a bare direction. One commit after it is made, the panel either is
 * in the state the request asked for — the transition happened, and the handler
 * that consumes the request has run or is about to — or it is not, and the
 * request is dropped instead of being honoured by some later, unrelated open or
 * close. A `Root` is allowed to refuse: a controlled consumer that ignores
 * `onOpenChange(false)` is a menu that will not close, which is legal.
 */
type MenuRequest
  = | {
    wantsOpen: true;
    /** Which end of the list the open should land on. */
    landOn: 'last';
  }
  | {
    wantsOpen: false;
    /** Which way `Tab` was going: forward, or `Shift+Tab` backward. */
    tabDirection: TabDirection;
  };

/**
 * The state this package holds, shared from `Root` down to `Trigger`, `Content`
 * and `SubContent`. Private — it is not exported, and no member takes it as a
 * prop.
 */
interface MenuState {
  /**
   * Open or close the panel, honouring a controlled `open` prop, and record what
   * the keystroke asking for it needs done when the panel gets there.
   *
   * Also where a request from an EARLIER interaction is dropped: every open and
   * close Radix reports arrives here, so an `Escape`, an outside press or a
   * selection that follows a refused `Tab` clears that `Tab`'s direction on its
   * way through.
   */
  setOpen: (open: boolean, request?: MenuRequest | null) => void;
  /**
   * The live request. A ref rather than the state it mirrors because both of its
   * readers run after the render that could have closed over it: `onEntryFocus`
   * fires from inside `FocusScope`'s mount effect, and `onCloseAutoFocus` fires
   * from a timeout scheduled while `Content` was being unmounted.
   */
  requestRef: RefObject<MenuRequest | null>;
  /**
   * The trigger's DOM node, which is where the `Tab` patch measures the next
   * tabbable element FROM. Kept as a real reference rather than re-derived from
   * the panel's `aria-labelledby`, so the patch does not quietly stop working
   * the day Radix labels the panel some other way.
   */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /**
   * What held focus when the panel last opened — the `Tab` close's answer when
   * there is no trigger to measure from.
   *
   * There has to be one. Radix's own `onCloseAutoFocus` focuses
   * `triggerRef.current?.focus()` and then `preventDefault()`s UNCONDITIONALLY
   * (`react-dropdown-menu/dist/index.mjs:114-118`), which cancels `FocusScope`'s
   * restore for every close — so "let Radix restore it" is not an answer
   * available to this package. With no trigger in the tree, nothing focuses
   * anything and focus lands on `<body>`: a WCAG 2.4.3 failure, and the reader's
   * next `Tab` restarts at the top of the document. `Escape` has the same hole
   * one layer down, in Radix, where this package cannot reach without taking
   * focus placement over for every close.
   */
  focusBeforeOpenRef: RefObject<HTMLElement | null>;
}

/**
 * `useLayoutEffect` where there is a document and a no-op where there is not, the
 * same shape `@radix-ui/react-use-layout-effect` has — which cannot be imported
 * here, because it is a transitive of the `@radix-ui/themes` peer and naming it
 * would be a phantom dependency. Layout rather than passive because `FocusScope`
 * moves focus into the panel from a PASSIVE effect, and every layout effect in a
 * commit runs before any passive one; a server has no focus to record.
 */
const useFocusRecordEffect = globalThis.document === undefined ? useEffect : useLayoutEffect;

const MenuStateContext = createContext<MenuState | null>(null);

/**
 * @param member the member asking, so the throw names the element in the tree
 * that is in the wrong place
 */
function useMenuState(member: string): MenuState {
  const state = use(MenuStateContext);
  if (state === null) {
    throw new Error(
      `${member} must be rendered inside a DropdownMenu.Root from `
      + '@pineappleui/dropdown-menu. Rendering it under Radix\'s own DropdownMenu.Root instead '
      + 'compiles and then loses this package\'s Tab and ArrowUp key handling, which is state '
      + 'that only its own Root holds.',
    );
  }
  return state;
}

/**
 * One node, two refs: the consumer's, and the one this package keeps for the
 * `Tab` patch. Returns React 19's cleanup form, so a consumer whose own ref
 * callback returns a cleanup still gets it called.
 */
function composeTriggerRef(
  own: RefObject<HTMLButtonElement | null>,
  consumer: Ref<HTMLButtonElement> | undefined,
): RefCallback<HTMLButtonElement> {
  return (node) => {
    own.current = node;
    const cleanup = typeof consumer === 'function' ? consumer(node) : undefined;
    if (consumer !== null && consumer !== undefined && typeof consumer !== 'function') {
      consumer.current = node;
    }
    return () => {
      own.current = null;
      if (typeof cleanup === 'function') {
        cleanup();
      }
      else if (typeof consumer === 'function') {
        consumer(null);
      }
      else if (consumer !== null && consumer !== undefined) {
        consumer.current = null;
      }
    };
  };
}

/**
 * `onEntryFocus` as the ArrowUp patch needs it.
 *
 * It is a real, documented prop of `MenuContentImplProps` in
 * `@radix-ui/react-menu`, and it reaches that component untouched: Radix Themes'
 * `Content` spreads everything `extractProps` did not claim, and
 * `@radix-ui/react-dropdown-menu` spreads its own rest onto `MenuPrimitive.Content`
 * without setting one of its own. What `react-dropdown-menu` does is `Omit` it
 * from its PUBLIC type, to keep it out of its own API — so the prop works and
 * does not typecheck.
 *
 * Passed as its own typed object and spread, rather than widened into
 * `ContentProps`: JSX spread attributes are exempt from excess-property
 * checking, and widening would publish a prop this package consumes itself,
 * inviting a consumer to double-handle the one event the ArrowUp patch depends
 * on owning.
 */
interface EntryFocusEscapeHatch {
  onEntryFocus: (event: Event) => void;
}

/**
 * `Tab` while the menu is open, with no modifier — the APG's "close the menu and
 * move focus onward". `Ctrl`/`Alt`/`Meta` + `Tab` belongs to the window manager,
 * and Radix's own `FocusScope` excludes it the same way.
 */
function isPlainTab(event: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
  return event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
}

/**
 * PATCH 2 of 2 — the APG requires `Tab` to close the menu and move focus onward.
 * Radix swallows the key, and `FocusScope` swallows it again under `modal`, so
 * the destination cannot be reached natively and has to be computed. Only the
 * DIRECTION is recorded here: the panel is still in the DOM and still holds the
 * focused item, so a scan taken now would answer with a menu item. It runs in
 * `Content`'s `onCloseAutoFocus`, after `FocusScope`'s unmount timeout, when the
 * panel is gone and the trap's listeners are with it.
 *
 * Shared by `Content` and `SubContent` so that the panel a `Tab` came FROM is
 * the one that handles it — one level down, `SubContent` is that panel. The
 * pending direction lands in `Root`'s shared state either way, so the root
 * panel's `onCloseAutoFocus` is still the single place focus is placed.
 */
function panelTabHandler(
  state: MenuState,
  consumerOnKeyDown: RadixContentProps['onKeyDown'],
): NonNullable<RadixContentProps['onKeyDown']> {
  return (event) => {
    // WHICH PANEL the keystroke came from. React bubbles a portalled event up
    // the REACT tree, so a `Tab` pressed inside an open `SubContent` reaches the
    // ROOT panel's handler too — and by then the submenu's own handler has
    // already run and prevented it. `event.defaultPrevented` cannot tell that
    // apart from a consumer's own `Item.onKeyDown` preventing the key, because an
    // `Item` is deeper in the DOM as well: reading it as "a nested panel did it"
    // silently ignored every consumer opt-out.
    //
    // `target.closest('[data-radix-menu-content]') === currentTarget` answers
    // "did this keydown originate in MY panel" exactly, and it is Radix's own
    // test for the same question — the line that decides whether `react-menu`
    // swallows the key at all. With the origin settled, `defaultPrevented` after
    // the consumer's handler means what it says: somebody in this panel opted
    // out, and the only somebody left is the consumer.
    const { target } = event;
    const isFromThisPanel = target instanceof Element
      && target.closest('[data-radix-menu-content]') === event.currentTarget;
    consumerOnKeyDown?.(event);
    if (!isFromThisPanel || event.defaultPrevented || !isPlainTab(event)) {
      return;
    }
    state.setOpen(false, {
      wantsOpen: false,
      tabDirection: event.shiftKey ? 'backward' : 'forward',
    });
  };
}

// A value namespace, so `DropdownMenu.Item` is the call site and
// `DropdownMenu.ItemProps` is the type — the shape `TextField.RootProps` already
// set here. `dist/index.mjs` stops being a pure re-export as a result: a value
// namespace emits an IIFE.
//
// eslint-disable-next-line ts/no-namespace
export namespace DropdownMenu {
  export type RootProps = RadixDropdownMenu.RootProps & {
    /**
     * Whether the panel is open, when you want to own that state — pair it with
     * `onOpenChange`. Reach for it when something outside the menu has to open or
     * close it: a keyboard shortcut elsewhere on the page, a guided tour, a
     * parent that closes every panel on navigation.
     */
    open?: RadixDropdownMenu.RootProps['open'];
    /**
     * Whether the panel is open on the first render, for the uncontrolled case.
     * Read once and then ignored, so pass `open` instead if the value can change
     * while the menu is on screen.
     */
    defaultOpen?: RadixDropdownMenu.RootProps['defaultOpen'];
    /**
     * Called with the panel's new open state every time it opens or closes,
     * whatever caused it — the trigger, `Escape`, a press outside, selecting an
     * item, or this package's `Tab` handling. The place to hang analytics, or to
     * fetch the items the menu is about to show.
     */
    onOpenChange?: RadixDropdownMenu.RootProps['onOpenChange'];
    /**
     * Whether the open panel behaves as a modal layer, which is four things at
     * once: the page behind it is scroll-locked, hidden from assistive technology,
     * and cannot be clicked (`pointer-events: none` on `<body>`), and focus is
     * trapped inside the panel until it closes. That is what a menu does in
     * production, and it is also why one press outside is spent dismissing rather
     * than acting. Turn it off for a menu opening over a surface that has to stay
     * usable — a canvas, an editor, a docs playground — and the panel will track
     * its trigger as it moves and let the page keep scrolling underneath.
     */
    modal?: RadixDropdownMenu.RootProps['modal'];
    /**
     * Reading direction for the panel and its submenus. In `rtl` a submenu opens
     * to the left and the two arrow keys that open and close it swap over. Set it
     * here for one menu, or once for the whole app with Radix's
     * `DirectionProvider`.
     */
    dir?: RadixDropdownMenu.RootProps['dir'];
  };

  /**
   * The menu's root. Renders no DOM of its own and takes no ref: it holds the
   * open state and provides it to the trigger and the panel.
   */
  export function Root({ open, defaultOpen, ...rest }: RootProps) {
    // Read off `rest` rather than destructured in the signature, and left IN
    // `rest` deliberately: Radix declares `onOpenChange` as a method signature
    // (`onOpenChange?(open: boolean): void`), and pulling a method out of the
    // props type directly trips `ts/unbound-method` — there is nothing to unbind
    // here, it is a consumer's callback. The explicit `onOpenChange={setOpen}`
    // below sits after the spread, so ours is the one Radix sees.
    const { onOpenChange } = rest;
    const isControlled = open !== undefined;
    const [openState, setOpenState] = useState(defaultOpen ?? false);
    const isOpen = isControlled ? open : openState;

    // Two copies of one value, each doing a job the other cannot. The REF is what
    // `Content` reads, because both readers run after the render that could have
    // closed over the state. The STATE is what guarantees a COMMIT: without it a
    // controlled `Root` whose consumer ignores `onOpenChange` never re-renders,
    // so nothing would ever observe the refusal and the request would sit armed
    // for the next open or close, whenever and whatever that was.
    const requestRef = useRef<MenuRequest | null>(null);
    const [request, setRequest] = useState<MenuRequest | null>(null);

    const setOpen = useCallback((next: boolean, nextRequest: MenuRequest | null = null) => {
      // Radix's own controlled path reports a change, never a no-op, and this
      // matches it: `ArrowUp` on a trigger whose panel is already open asks for
      // nothing, so it reports nothing and arms nothing. It does not weaken the
      // double-close detector — two calls inside one event both read the same
      // render's `isOpen`.
      if (next === isOpen) {
        return;
      }
      requestRef.current = nextRequest;
      setRequest(nextRequest);
      // A controlled Root reports and obeys: the consumer's `open` decides, and
      // this is what keeps `open={false}` closed while the trigger is pressed.
      if (!isControlled) {
        setOpenState(next);
      }
      onOpenChange?.(next);
    }, [isControlled, isOpen, onOpenChange]);

    // A request lives exactly as long as the transition it asked for. One commit
    // after it was made, the panel is either in the state it asked for — in which
    // case `onEntryFocus` has already consumed it, or `onCloseAutoFocus` is about
    // to — or the transition did not happen and the request is dropped here,
    // rather than being honoured by a later close (which is what sent `Escape`'s
    // focus onward instead of back to the trigger) or a later open (which is what
    // highlighted an item on a pointer open).
    useEffect(() => {
      if (request === null || request.wantsOpen === isOpen) {
        return;
      }
      requestRef.current = null;
    }, [request, isOpen]);

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const focusBeforeOpenRef = useRef<HTMLElement | null>(null);
    useFocusRecordEffect(() => {
      if (!isOpen) {
        return;
      }
      // The same element `FocusScope` records as its own restore target, read at
      // the same point in the commit — before anything has moved focus into the
      // panel.
      const active = document.activeElement;
      focusBeforeOpenRef.current = active instanceof HTMLElement ? active : null;
    }, [isOpen]);

    const state = useMemo<MenuState>(
      () => ({ setOpen, requestRef, triggerRef, focusBeforeOpenRef }),
      [setOpen],
    );

    return (
      <MenuStateContext value={state}>
        <RadixDropdownMenu.Root {...rest} open={isOpen} onOpenChange={setOpen} />
      </MenuStateContext>
    );
  }

  // `& {}` on this member and on `Label`, `Group` and `Separator` is not a
  // leftover: those four declare ZERO own props today (everything they take is
  // React's or Radix's shared layout set), and the empty overlay is where the
  // JSDoc goes on the day one of them gains one. Written the same way as the
  // nine members that have props, so "no own props" reads as a measurement
  // rather than as a member somebody forgot.
  export type TriggerProps = RadixTriggerProps & {};

  /**
   * The button that discloses the panel. Takes exactly one React element child
   * that accepts a ref and spreads props — a `Button`, an `IconButton`, a `Card`.
   * Radix throws on a text or fragment child rather than rendering a trigger
   * nothing can be attached to.
   */
  export function Trigger({ ref, onKeyDown, ...rest }: TriggerProps) {
    const { setOpen, triggerRef } = useMenuState('DropdownMenu.Trigger');
    const setTriggerRef = useMemo(() => composeTriggerRef(triggerRef, ref), [triggerRef, ref]);

    return (
      <RadixDropdownMenu.Trigger
        {...rest}
        ref={setTriggerRef}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.key !== 'ArrowUp') {
            return;
          }
          // PATCH 1 of 2 — the APG lists ArrowUp on a menu button as "open and
          // focus the LAST item"; Radix implements ArrowDown and ignores this
          // one. `preventDefault()` also stops the page scrolling under the
          // panel, which is what Radix does for ArrowDown.
          //
          // Which item is last and enabled is deliberately NOT re-derived here:
          // the request records only which END to land on, and `Content` hands
          // the question back to Radix's own first/last branch. See
          // `onEntryFocus` below. Nothing has to scrub the request afterwards —
          // an open that this keystroke did not cause drops it, in `setOpen` for
          // an open Radix reports and in `Root`'s effect for one it does not.
          event.preventDefault();
          setOpen(true, { wantsOpen: true, landOn: 'last' });
        }}
      />
    );
  }

  export type ContentProps = RadixContentProps & {
    /**
     * The panel's scale: item height, padding, corner radius and type size all
     * move together. Responsive, so a menu can be roomier on a small viewport
     * than on a desktop one — which is the answer to touch targets here, rather
     * than a third size.
     */
    size?: RadixContentProps['size'];
    /**
     * How the highlighted item is drawn: `solid` fills the row with the accent,
     * where `soft` tints it and leaves the label alone. Solid is the stronger
     * signal; soft suits a menu opening over already-busy chrome.
     */
    variant?: RadixContentProps['variant'];
    /**
     * The accent the highlighted item is filled with, as a scale name from the
     * theme rather than a CSS colour. Omit it to inherit the surrounding theme's
     * accent, which is almost always right; set it when the menu belongs to a
     * region with an accent of its own.
     */
    color?: RadixContentProps['color'];
    /**
     * Draw the highlight at the top of the accent scale instead of its mid-tone,
     * for a menu that has to carry more contrast than the theme's default pairing
     * gives it.
     */
    highContrast?: RadixContentProps['highContrast'];
    /**
     * Which side of the trigger the panel opens on. Below is the menu-button
     * convention. The panel may still flip to the opposite side when there is no
     * room, and `data-side` on the panel reports where it actually landed — which
     * is what the open animation reads, so a flipped panel still grows from the
     * right edge.
     */
    side?: RadixContentProps['side'];
    /**
     * The gap in pixels between the trigger and the panel, on whichever side it
     * opened. Radix Themes' default already clears the trigger's focus ring, so
     * the reason to change it is a trigger whose visual edge is not its box edge —
     * a `Card` with its own padding, or an `IconButton` inside a toolbar with a
     * border of its own.
     */
    sideOffset?: RadixContentProps['sideOffset'];
    /**
     * Where the panel lines up across the trigger: flush with its start edge,
     * centred on it, or flush with its end edge. Start is what a menu button
     * reads as; centre earns its keep when the panel is much wider than a small
     * trigger.
     */
    align?: RadixContentProps['align'];
    /**
     * Pixels to slide the panel along the alignment axis after `align` has placed
     * it — for lining the panel up with the trigger's label rather than with the
     * edge of its box.
     */
    alignOffset?: RadixContentProps['alignOffset'];
    /**
     * Whether the panel flips to the opposite side, and then slides along the
     * cross axis, to stay inside the viewport. Turn it off only when the panel
     * must be exactly where `side` and `align` put it and you can guarantee the
     * room.
     */
    avoidCollisions?: RadixContentProps['avoidCollisions'];
    /**
     * How much room to leave between the panel and the edge it is avoiding, as one
     * number for every side or a number per side. This is what stops a flipped
     * panel sitting flush against the window.
     */
    collisionPadding?: RadixContentProps['collisionPadding'];
    /**
     * The element or elements whose edges the panel treats as the ones it must not
     * cross. The viewport by default; name a scroll container when the menu opens
     * inside a region that has its own edges.
     */
    collisionBoundary?: RadixContentProps['collisionBoundary'];
    /**
     * How hard the panel stays attached to a trigger that is scrolling out of
     * view: `partial` keeps as much of the panel anchored as still fits, where
     * `always` keeps it glued to the trigger even when that means overlapping it.
     */
    sticky?: RadixContentProps['sticky'];
    /**
     * Whether the panel hides itself once its trigger has scrolled out of view.
     * Worth turning on for a trigger inside a scroll container, where the panel
     * would otherwise hang over content its trigger no longer sits beside.
     */
    hideWhenDetached?: RadixContentProps['hideWhenDetached'];
    /**
     * How often the panel recomputes its position: on the events that can move the
     * trigger, or on every animation frame. Only reach for the second when the
     * trigger itself is animating.
     */
    updatePositionStrategy?: RadixContentProps['updatePositionStrategy'];
    /**
     * Whether the arrow keys wrap from the last item back round to the first.
     * Defaults to `true` here, against Radix's `false`: a keyboard user who
     * overshoots the end of a three-item menu should not have to arrow all the way
     * back up it.
     */
    loop?: RadixContentProps['loop'];
    /**
     * How close to a corner of the panel its arrow may sit before the panel shifts
     * instead. `DropdownMenu` renders no arrow — Radix Themes deliberately exports
     * none — so this positions nothing. It arrives with the shared popper props
     * and is described here because a blank row is worse than an honest one.
     */
    arrowPadding?: RadixContentProps['arrowPadding'];
    /**
     * The element the panel is rendered into. The end of `<body>` by default,
     * which is what keeps it clear of every ancestor's `overflow: hidden`. Point
     * it at your own node when the panel has to live inside one particular
     * stacking context — an open `<dialog>`, or a region that must clip it.
     */
    container?: RadixContentProps['container'];
    /**
     * Keep the panel mounted while the menu is closed, so an animation library
     * can own its exit. Leave it off otherwise: a closed menu is then absent from
     * the DOM entirely, which is what keeps `role="menu"` out of the accessibility
     * tree when there is nothing to read. It also does not compose with this
     * package's `Tab` handling in v1, and that is a documented limit rather than a
     * bug to work around — Radix fires `onCloseAutoFocus` only when the panel
     * actually unmounts, so a `Tab` out of a force-mounted panel closes the menu
     * and leaves focus inside the closed panel. Reach for it for an external exit
     * animation, and not on a menu a keyboard reader tabs out of.
     */
    forceMount?: RadixContentProps['forceMount'];
    /**
     * Called when `Escape` is pressed while the panel is open, before it closes.
     * Call `preventDefault()` to keep it open — sparingly, because `Escape` is the
     * exit every keyboard user reaches for first and the only one this package
     * guarantees.
     */
    onEscapeKeyDown?: RadixContentProps['onEscapeKeyDown'];
    /**
     * Called on a pointer press that lands outside the panel, before it closes;
     * `preventDefault()` keeps the panel open. The press still reaches whatever it
     * landed on either way.
     */
    onPointerDownOutside?: RadixContentProps['onPointerDownOutside'];
    /**
     * Called when focus moves to something outside the panel, before it closes.
     * Preventable, for the rare menu that has to survive focus landing elsewhere.
     */
    onFocusOutside?: RadixContentProps['onFocusOutside'];
    /**
     * Called for either kind of outside interaction — a pointer press or focus
     * leaving — after the specific handler for it. The one place to write
     * "anything outside, except this toolbar" once instead of twice.
     */
    onInteractOutside?: RadixContentProps['onInteractOutside'];
    /**
     * Called just before focus is restored on close, and preventable. This package
     * already uses it to place focus for its own `Tab` handling, so a handler that
     * calls `preventDefault()` takes focus placement over for EVERY close,
     * including the `Tab` one.
     */
    onCloseAutoFocus?: RadixContentProps['onCloseAutoFocus'];
  };

  /**
   * The panel: `role="menu"`, labelled by the trigger, portalled out of the app
   * tree so no ancestor can clip it. Everything inside scrolls when the panel
   * runs out of room rather than being cut off.
   */
  export function Content({
    loop = true,
    onKeyDown,
    onCloseAutoFocus,
    ...rest
  }: ContentProps) {
    const state = useMenuState('DropdownMenu.Content');
    const { requestRef, triggerRef, focusBeforeOpenRef } = state;

    const entryFocus: EntryFocusEscapeHatch = {
      onEntryFocus: (event) => {
        const request = requestRef.current;
        // Consumed here, whatever it was: entry focus can happen more than once
        // in one open — focus returning from a submenu re-enters this panel's
        // roving group — and an open lands on its requested end once.
        requestRef.current = null;
        if (request === null || !request.wantsOpen
          || !(event.currentTarget instanceof HTMLElement)) {
          return;
        }
        // PATCH 1 of 2, second half. `preventDefault()` suppresses Radix's own
        // entry focus (the first enabled item); the synthetic `End` then lands on
        // Radix's own first/last branch in `Content`'s keydown handler, which
        // reverses ITS OWN enabled-item collection. So "which item is last, and
        // is it enabled" stays one implementation, in Radix, and a disabled last
        // item is skipped without this package knowing that rule exists.
        //
        // The dispatched event is a real `keydown` and is visible to a consumer's
        // own `Content.onKeyDown`, which is documented in the README.
        event.preventDefault();
        event.currentTarget.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
        );
      },
    };

    return (
      <RadixDropdownMenu.Content
        loop={loop}
        {...rest}
        {...entryFocus}
        onKeyDown={panelTabHandler(state, onKeyDown)}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          const request = requestRef.current;
          requestRef.current = null;
          if (request === null || request.wantsOpen || event.defaultPrevented) {
            return;
          }
          // The destination is resolved BEFORE anything is cancelled, in both
          // arms. Radix's own handler runs after this one and only while the
          // default stands, so `preventDefault()` is what takes focus placement
          // over — and taking it over with nowhere to put focus is how focus ends
          // up on `<body>`.
          const trigger = triggerRef.current;
          if (trigger !== null) {
            event.preventDefault();
            focusNextTabbableFrom(trigger, request.tabDirection);
            return;
          }
          // Nothing to measure the next tabbable element FROM: a `Root` driven
          // entirely by `open` need not render a `Trigger` at all, and one that
          // does can unmount it while the panel is open. Focus goes back where it
          // was before the panel opened — which is what Radix's own
          // trigger-refocus stands in for, and it has to happen here because
          // Radix's version cancels `FocusScope`'s restore whether or not it
          // found a trigger to focus. `Tab` then behaves as `Escape` does: there
          // is no anchor to move onward FROM, and a defined destination beats the
          // document's top.
          const restore = focusBeforeOpenRef.current;
          if (restore === null || !restore.isConnected) {
            return;
          }
          event.preventDefault();
          restore.focus();
        }}
      />
    );
  }

  export type LabelProps = RadixLabelProps & {};

  /**
   * A heading over a run of items. Renders plain text and wires nothing up on its
   * own: give it an `id` and point the `Group` beside it at that `id` with
   * `aria-labelledby`, or a screen reader reads it as loose text inside an
   * unnamed group.
   */
  export function Label(props: LabelProps) {
    return <RadixDropdownMenu.Label {...props} />;
  }

  export type GroupProps = RadixGroupProps & {};

  /**
   * A `role="group"` around related items. Name it with `aria-labelledby`
   * pointing at a `Label`'s `id` — that pairing is manual, and it is the one
   * accessibility gap the layer underneath leaves open.
   */
  export function Group(props: GroupProps) {
    return <RadixDropdownMenu.Group {...props} />;
  }

  export type ItemProps = RadixItemProps & {
    /**
     * Called when the item is activated by pointer, `Enter` or `Space`. Calling
     * `preventDefault()` on the event it is handed is the one documented way to
     * keep the panel open afterwards — which is what a menu of toggles needs.
     */
    onSelect?: RadixItemProps['onSelect'];
    /**
     * Whether the item is shown but cannot be activated. Arrow keys and typeahead
     * skip it and it still announces as disabled. Do not use it for an action that
     * is ALWAYS unavailable: leave that item out, or the menu becomes a list of
     * things the reader cannot do.
     */
    disabled?: RadixItemProps['disabled'];
    /**
     * The text typeahead matches this item on, when its rendered label is not the
     * right thing to match — a label that is visually truncated, or one that is an
     * icon plus a word.
     */
    textValue?: RadixItemProps['textValue'];
    /**
     * A keyboard hint drawn right-aligned inside the item. It is a LABEL and
     * nothing else: this binds no key, the consumer still has to wire the
     * keystroke up, and the text is read out as part of the item's name — so a
     * hint for a shortcut that does not exist is a lie in two places.
     */
    shortcut?: RadixItemProps['shortcut'];
    /**
     * The accent this one item is drawn in, overriding the panel's. This is how a
     * destructive entry is marked — give it the crimson accent and change nothing
     * else, no icon and no border. Takes a scale name from the theme, never a CSS
     * colour.
     */
    color?: RadixItemProps['color'];
    /**
     * Render the child element instead of the item's own `<div>`, so an entry that
     * navigates can be a real `<a href>` — which keeps middle-click, open-in-new-tab
     * and copy-link-address working, none of which a click handler gives you.
     */
    asChild?: RadixItemProps['asChild'];
  };

  /**
   * One command. Its label is its accessible name, so put an icon in `children`
   * beside the text rather than reaching for a prop.
   */
  export function Item(props: ItemProps) {
    return <RadixDropdownMenu.Item {...props} />;
  }

  export type CheckboxItemProps = RadixCheckboxItemProps & {
    /**
     * Whether the item reads as checked, where `indeterminate` draws the mixed
     * state for a toggle that governs a set only some of which is on. There is no
     * `defaultChecked` — this IS the state, so pass it back from wherever
     * `onCheckedChange` puts it or the tick never appears. Unlike
     * `RadioGroup.value`, leaving it off is not "uncontrolled": it is an item that
     * cannot be ticked.
     */
    checked?: RadixCheckboxItemProps['checked'];
    /**
     * Called with the new checked state when the item is activated. It is the only
     * half of the pair that moves: wire it to state and feed that state back into
     * `checked`. What it does not do is decide whether the panel stays open —
     * that is `onSelect`, and a checkbox menu almost always wants it.
     */
    onCheckedChange?: RadixCheckboxItemProps['onCheckedChange'];
    /**
     * Called when the item is activated, before it closes the panel.
     * `preventDefault()` here is what keeps the panel open so several boxes can be
     * ticked in one visit — which is nearly always what a checkbox menu wants.
     */
    onSelect?: RadixCheckboxItemProps['onSelect'];
    /**
     * Whether the toggle is shown but cannot be flipped. Arrow keys and typeahead
     * skip it, and it announces as disabled rather than disappearing.
     */
    disabled?: RadixCheckboxItemProps['disabled'];
    /**
     * The text typeahead matches this item on, when its rendered label is not the
     * right thing to match — a label that is visually truncated, or one that is an
     * icon plus a word.
     */
    textValue?: RadixCheckboxItemProps['textValue'];
    /**
     * A keyboard hint drawn right-aligned inside the item. A label only — binding
     * the key is still the consumer's job.
     */
    shortcut?: RadixCheckboxItemProps['shortcut'];
    /**
     * The accent this one item is drawn in, overriding the panel's. Takes a scale
     * name from the theme, never a CSS colour.
     */
    color?: RadixCheckboxItemProps['color'];
  };

  /**
   * A command that carries an on/off state — `role="menuitemcheckbox"` with the
   * indicator gutter Radix opens up for the whole panel at once, so the items
   * around it stay aligned.
   */
  export function CheckboxItem(props: CheckboxItemProps) {
    return <RadixDropdownMenu.CheckboxItem {...props} />;
  }

  export type RadioGroupProps = RadixRadioGroupProps & {
    /**
     * The `value` of the item currently selected in this group. Pass it with
     * `onValueChange` to own the selection; leave both off and the group keeps it
     * itself.
     */
    value?: RadixRadioGroupProps['value'];
    /**
     * Called with the newly selected item's `value`. A radio group in a menu is
     * still a set of commands — when what you are collecting is a form value,
     * that is a select, not a menu.
     */
    onValueChange?: RadixRadioGroupProps['onValueChange'];
  };

  /** A set of mutually exclusive choices, one of which is selected. */
  export function RadioGroup(props: RadioGroupProps) {
    return <RadixDropdownMenu.RadioGroup {...props} />;
  }

  export type RadioItemProps = RadixRadioItemProps & {
    /**
     * What this item contributes to its group's `value`. Required, and unique
     * within the group: it is how the selected item is identified.
     */
    value: RadixRadioItemProps['value'];
    /**
     * Called when the item is activated. `preventDefault()` keeps the panel open,
     * which is worth it when the reader is likely to try more than one choice.
     */
    onSelect?: RadixRadioItemProps['onSelect'];
    /**
     * Whether the choice is shown but cannot be picked. Skipped by the arrow keys
     * and by typeahead, and announced as disabled.
     */
    disabled?: RadixRadioItemProps['disabled'];
    /**
     * The text typeahead matches this choice on, when its rendered label is not the
     * right thing to match — a truncated label, or one carrying a swatch or an icon
     * beside the word.
     */
    textValue?: RadixRadioItemProps['textValue'];
    /**
     * The accent this one item is drawn in, overriding the panel's. Takes a scale
     * name from the theme, never a CSS colour.
     */
    color?: RadixRadioItemProps['color'];
  };

  /** One choice in a `RadioGroup` — `role="menuitemradio"`. */
  export function RadioItem(props: RadioItemProps) {
    return <RadixDropdownMenu.RadioItem {...props} />;
  }

  export type SeparatorProps = RadixSeparatorProps & {};

  /**
   * A rule between two runs of items — `role="separator"`. It groups visually and
   * nothing more; when the groups need names, use `Group` and `Label` as well.
   */
  export function Separator(props: SeparatorProps) {
    return <RadixDropdownMenu.Separator {...props} />;
  }

  export type SubProps = RadixDropdownMenu.SubProps & {
    /**
     * Whether this submenu's panel is open, when you want to own that state.
     * Rarely needed: a submenu that opens on hover and on `ArrowRight` is already
     * doing the right thing.
     */
    open?: RadixDropdownMenu.SubProps['open'];
    /**
     * Whether the submenu starts open. Read once on mount and then ignored, and
     * almost never what you want: a submenu that starts open covers the very row
     * that opens it, and the reader has to close something they never asked for
     * before they can read the rest of the menu.
     */
    defaultOpen?: RadixDropdownMenu.SubProps['defaultOpen'];
    /**
     * Called with the submenu's new open state each time it opens or closes —
     * hovering in, `ArrowRight`, `ArrowLeft`, or the whole tree closing at once.
     */
    onOpenChange?: RadixDropdownMenu.SubProps['onOpenChange'];
  };

  /**
   * One level of nested menu, wrapping a `SubTrigger` and a `SubContent`. It
   * composes recursively, so deeper nesting works; do not — three levels deep is
   * unhittable on a touch device and hard to hold in your head anywhere else.
   */
  export function Sub(props: SubProps) {
    return <RadixDropdownMenu.Sub {...props} />;
  }

  export type SubTriggerProps = RadixSubTriggerProps & {
    /**
     * Whether the submenu can be opened at all. A disabled sub-trigger is skipped
     * by the arrow keys and by typeahead, exactly like a disabled item.
     */
    disabled?: RadixSubTriggerProps['disabled'];
    /**
     * The text typeahead matches this sub-trigger on, when its rendered label is
     * not the right thing to match. Worth setting more often here than on an
     * `Item`: a sub-trigger's label is usually the shortest word that fits beside
     * the submenu chevron, and typeahead is how a keyboard reader finds it.
     */
    textValue?: RadixSubTriggerProps['textValue'];
  };

  /**
   * The row that opens a submenu. Announces as a submenu, opens on hover after an
   * intent delay without moving focus, and on `ArrowRight` with focus.
   */
  export function SubTrigger(props: SubTriggerProps) {
    return <RadixDropdownMenu.SubTrigger {...props} />;
  }

  export type SubContentProps = RadixSubContentProps & {
    /**
     * Which end of the parent item the submenu lines up with. There is no centre
     * here: a submenu is anchored to one row, not to a box.
     */
    align?: RadixSubContentProps['align'];
    /**
     * Pixels to slide the submenu along the parent panel's axis after `align` has
     * placed it. The default already compensates for the parent panel's padding,
     * so most menus leave this alone.
     */
    alignOffset?: RadixSubContentProps['alignOffset'];
    /**
     * The gap in pixels between the parent item and the submenu. The default of
     * 1px covers the parent panel's outer shadow rather than leaving a hairline of
     * page between the two.
     */
    sideOffset?: RadixSubContentProps['sideOffset'];
    /**
     * Whether the submenu flips to the other side of the parent panel when there
     * is no room on its own side.
     */
    avoidCollisions?: RadixSubContentProps['avoidCollisions'];
    /**
     * How much room to leave between the submenu and the edge it is avoiding, as
     * one number for every side or a number per side.
     */
    collisionPadding?: RadixSubContentProps['collisionPadding'];
    /**
     * The element or elements whose edges the submenu treats as the ones it must
     * not cross. The viewport by default; name the same scroll container you gave
     * the parent panel, or the two halves of one menu can be bounded by different
     * things and the submenu flips where the parent did not.
     */
    collisionBoundary?: RadixSubContentProps['collisionBoundary'];
    /**
     * How hard the submenu stays anchored to a parent item that is scrolling out
     * of the parent panel — as much of it as fits, or glued to the item.
     */
    sticky?: RadixSubContentProps['sticky'];
    /**
     * Whether the submenu hides itself once the item it hangs off has scrolled out
     * of view.
     */
    hideWhenDetached?: RadixSubContentProps['hideWhenDetached'];
    /**
     * How often the submenu recomputes its position: on the events that can move
     * its anchor, or on every animation frame.
     */
    updatePositionStrategy?: RadixSubContentProps['updatePositionStrategy'];
    /**
     * Whether the arrow keys wrap from the submenu's last item back to its first.
     * Defaults to `true` here, matching the parent panel, against Radix's `false`.
     */
    loop?: RadixSubContentProps['loop'];
    /**
     * How close to a corner of the submenu its arrow may sit. Submenus render no
     * arrow, so this positions nothing — it arrives with the shared popper props.
     */
    arrowPadding?: RadixSubContentProps['arrowPadding'];
    /**
     * The element the submenu is rendered into; the end of `<body>` by default. If
     * you moved the parent panel with `container`, move this one to match or the
     * two halves of one menu end up in different stacking contexts.
     */
    container?: RadixSubContentProps['container'];
    /**
     * Keep the submenu mounted while it is closed, for an animation library that
     * owns its exit. Off otherwise, so a closed submenu is absent from the DOM.
     */
    forceMount?: RadixSubContentProps['forceMount'];
    /**
     * Called when `Escape` is pressed inside the submenu. Note what it closes:
     * Radix takes the WHOLE tree down and returns focus to the root trigger, where
     * the APG closes only this level. `preventDefault()` is where you would stop
     * that.
     */
    onEscapeKeyDown?: RadixSubContentProps['onEscapeKeyDown'];
    /**
     * Called on a pointer press outside the submenu, before it closes;
     * `preventDefault()` keeps it open.
     */
    onPointerDownOutside?: RadixSubContentProps['onPointerDownOutside'];
    /**
     * Called when focus moves to something outside the submenu, before it closes;
     * `preventDefault()` keeps it open. Note where "outside" starts: the parent
     * panel is outside this one, so arrowing back to the sub-trigger is a focus
     * change this reports.
     */
    onFocusOutside?: RadixSubContentProps['onFocusOutside'];
    /**
     * Called for either kind of outside interaction — a pointer press or focus
     * leaving — after the specific handler for it.
     */
    onInteractOutside?: RadixSubContentProps['onInteractOutside'];
  };

  /**
   * A submenu's panel. Inherits `size`, `variant`, `color` and `highContrast`
   * from the `Content` it opens out of, so a submenu cannot drift from the menu it
   * belongs to.
   */
  export function SubContent({ loop = true, onKeyDown, ...rest }: SubContentProps) {
    // `Tab` is handled in the panel it was pressed in, one level down as well:
    // the root panel cannot tell a submenu's swallowed Tab from a consumer's own
    // `preventDefault()`, and a menu that closes on Tab has to keep doing so with
    // a submenu open. The direction lands in the shared state either way, so the
    // root panel's `onCloseAutoFocus` still places focus.
    const state = useMenuState('DropdownMenu.SubContent');

    return (
      <RadixDropdownMenu.SubContent
        loop={loop}
        {...rest}
        onKeyDown={panelTabHandler(state, onKeyDown)}
      />
    );
  }
}
