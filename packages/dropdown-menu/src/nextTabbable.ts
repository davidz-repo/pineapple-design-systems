// Where focus goes when `Tab` leaves an open menu.
//
// The APG requires `Tab` to close a menu and move focus onward, and Radix
// `preventDefault()`s the key unconditionally — twice over, since `FocusScope`
// does it again under `modal`. So native sequential focus navigation is
// unreachable from inside the panel, and the destination has to be COMPUTED and
// focused programmatically. That is what this file is: the browser's "next
// tabbable thing after this one", as far as a DOM scan can tell.
//
// The scan is deliberately the same shape as Radix's own
// `getTabbableCandidates` (`@radix-ui/react-focus-scope`) — a `TreeWalker` over
// `tabIndex >= 0`, skipping disabled, hidden and hidden-input elements — so this
// package's idea of what is focusable agrees with the rest of the stack it sits
// on rather than being a second, subtly different definition. One addition:
// `[data-radix-focus-guard]`, the pair of tabbable sentinel spans
// `@radix-ui/react-focus-guards` parks at the edges of `<body>` while a modal
// layer is up. Landing focus on one of those would be visibly nothing.
//
// WHAT IT DOES NOT DO — each of these is a real browser rule this approximates,
// and all four are published in the package README so a consumer can tell:
//
//   - POSITIVE `tabindex` ORDERING IS IGNORED. The browser visits `tabindex="1"`
//     before every `tabindex="0"`; this returns document order among everything
//     with `tabIndex >= 0`. Positive tabindex is a bug in almost every codebase
//     that has one, and honouring it here would mean implementing the whole
//     two-pass sequential focus navigation order for the one case.
//   - `inert` IS IGNORED. An element inside an `inert` subtree still reports its
//     own `tabIndex`, and jsdom does not implement `inert` at all, so a check
//     here could not be tested where the rest of this package is tested.
//   - SHADOW TREES ARE NOT CROSSED. `TreeWalker` stops at a shadow host.
//   - IFRAMES ARE NOT ENTERED, and neither is the browser's own chrome, which is
//     why running off either end CLAMPS (see `nextTabbableFrom`) instead of
//     handing focus somewhere unrepresentable.

/** Which way `Tab` was going: forward, or `Shift+Tab` backward. */
export type TabDirection = 'forward' | 'backward';

/**
 * The element the browser would focus next after `from`, stepping one place in
 * `direction` through the document's tabbable elements.
 *
 * Returns `null` when there is nothing there — `from` is the first or last
 * tabbable thing on the page, or is not tabbable itself. The caller decides what
 * that means; `DropdownMenu` keeps focus on the trigger, because the honest
 * destination at that point is the browser's own UI and no page element stands
 * in for it.
 */
export function nextTabbableFrom(from: HTMLElement, direction: TabDirection): HTMLElement | null {
  const root = from.ownerDocument.body;
  const candidates = tabbableCandidates(root);
  const index = candidates.indexOf(from);
  if (index === -1) {
    return null;
  }
  return candidates[index + (direction === 'forward' ? 1 : -1)] ?? null;
}

/**
 * Every element under `root` that the browser would stop on for `Tab`, in
 * document order.
 */
function tabbableCandidates(root: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const element = node as HTMLElement;
      if (isUnreachable(element)) {
        return NodeFilter.FILTER_SKIP;
      }
      return element.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  while (walker.nextNode() !== null) {
    found.push(walker.currentNode as HTMLElement);
  }
  return found;
}

/**
 * Tabbable by `tabIndex` and still not somewhere focus can usefully land: a
 * disabled control, a hidden one, a `type="hidden"` input, or one of Radix's own
 * focus sentinels.
 */
function isUnreachable(element: HTMLElement): boolean {
  // `disabled` and `type` live on the form-control subtypes rather than on
  // HTMLElement, and the walker sees every element — so they are read through a
  // narrowing cast rather than by testing the tag name against a list of the
  // eleven elements that have them.
  const formControl = element as HTMLElement & { disabled?: boolean; type?: string };
  return formControl.disabled === true
    || element.hidden
    || (element.tagName === 'INPUT' && formControl.type === 'hidden')
    || element.hasAttribute('data-radix-focus-guard');
}
