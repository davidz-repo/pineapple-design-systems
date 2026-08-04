import type { ReactNode } from 'react';
import { useTransition } from 'react';

import { TabNav } from '@radix-ui/themes';
import { useHref, useLinkClickHandler } from 'react-router';

// One tab in the strip, and the reason it is not react-router's `<Link>`.
//
// A tab's content suspends (a README, a CHANGELOG, a package's stories), and a
// navigation made inside a transition does NOT replace ready content with a
// fallback — React holds the tab you are on until the next one can draw. That
// is the right behavior and it is what `<Link>` already does, but it looks
// exactly like a click that did nothing: the strip does not move, the page does
// not move, and on a cold cache that lasts long enough to click again.
//
// So the navigation is started here instead, through the same two hooks `<Link>`
// composes — `useHref` for the address (basename included, so the tab is a real
// link a reader can copy or open in a new tab) and `useLinkClickHandler` for the
// click, which prevents the default only for the plain left-clicks a router
// should handle and leaves modifier-clicks to the browser. Wrapping THAT in
// `useTransition` is what makes `isPending` this component's own: the update and
// the hook's own bookkeeping are scheduled in one transition, so the flag stays
// up for exactly as long as the tab is still loading.
export function TabLink({
  to,
  isActive,
  children,
}: {
  to: string;
  isActive: boolean;
  children: ReactNode;
}) {
  const href = useHref(to);
  const handleClick = useLinkClickHandler<HTMLAnchorElement>(to);
  const [isPending, startTransition] = useTransition();

  return (
    <TabNav.Link asChild active={isActive}>
      <a
        className="site-tab-link"
        href={href}
        // `aria-busy` is the announced half and `data-pending` the drawn half:
        // site.css cannot select on an ARIA state it does not own, and a screen
        // reader cannot see a class.
        aria-busy={isPending || undefined}
        data-pending={isPending ? 'true' : undefined}
        onClick={(event) => {
          startTransition(() => {
            handleClick(event);
          });
        }}
      >
        {children}
      </a>
    </TabNav.Link>
  );
}
