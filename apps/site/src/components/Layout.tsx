import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@pineappleui/badge';
import { Button } from '@pineappleui/button';

import { Inline } from '@pineappleui/inline';
import { Text } from '@pineappleui/text';
import { Link, Outlet, useLocation } from 'react-router';

import { pageKeyFor, pageTitleFor } from './pageIdentity';
import { Sidebar } from './Sidebar';
import { ThemeControls } from './ThemeControls';

const REPO_URL = 'https://github.com/davidz-repo/pineapple-design-systems';
const NPM_ORG_URL = 'https://www.npmjs.com/org/pineappleui';

// The panel the header's Menu button discloses IS the sidebar: one <nav> in
// the document, laid out as a sticky column at >=860px and as a
// header-anchored panel below it (site.css owns that switch, so the breakpoint
// exists once). The id is passed down rather than exported so the trigger's
// aria-controls and the panel it names cannot drift apart.
const NAV_PANEL_ID = 'site-nav';

export function Layout() {
  const { pathname } = useLocation();
  const pageKey = pageKeyFor(pathname);

  // The panel is open *for a path*, so every navigation closes it by
  // derivation rather than by an effect that fires after the new page has
  // already painted with a menu over it. `onNavigate` below covers the one
  // case this cannot see: following the link for the page you are on.
  const [openedForPath, setOpenedForPath] = useState<string | null>(null);
  const isMenuOpen = openedForPath === pathname;

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const shownPageKeyRef = useRef<string | null>(null);

  // A disclosure, not a modal: no focus trap and no scroll lock. Closing it
  // from the keyboard or the trigger returns focus to the trigger; closing it
  // because the route changed does not, because the effect below is already
  // sending focus to the page that just loaded.
  const closeMenu = useCallback(() => {
    setOpenedForPath(null);
    menuTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMenu, isMenuOpen]);

  // Page changes only — see pageIdentity.ts for what that excludes. The title
  // is set on the first render too; the scroll and the focus move are not,
  // because arriving is not navigating. Comparing the key rather than
  // flipping a "have I run?" flag also survives StrictMode's double-invoked
  // effect, which would otherwise yank focus on the first load in dev.
  useEffect(() => {
    document.title = pageTitleFor(pageKey);
    const previousPageKey = shownPageKeyRef.current;
    shownPageKeyRef.current = pageKey;
    if (previousPageKey === null || previousPageKey === pageKey) {
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0 });
  }, [pageKey]);

  return (
    <div className="site-shell">
      <a className="site-skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="site-header-brand">
          <span className="accent-swatch" aria-hidden />
          <Text size="3" weight="bold">Pineapple UI</Text>
          <Badge className="site-docs-badge" variant="soft" size="1">docs</Badge>
        </Link>
        <Inline gap="4" align="center">
          <ThemeControls />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="site-sidebar-link"
          >
            GitHub
          </a>
          {/* Last in the header so the next tab stop after the trigger is the
              panel it opens — the panel sits later in the document. */}
          <Button
            ref={menuTriggerRef}
            type="button"
            className="site-menu-trigger"
            size="1"
            variant="soft"
            aria-expanded={isMenuOpen}
            aria-controls={NAV_PANEL_ID}
            onClick={() => (isMenuOpen ? closeMenu() : setOpenedForPath(pathname))}
          >
            Menu
          </Button>
        </Inline>
      </header>
      <Sidebar
        id={NAV_PANEL_ID}
        isOpen={isMenuOpen}
        onNavigate={() => setOpenedForPath(null)}
      />
      <main id="main" ref={mainRef} className="site-main" tabIndex={-1}>
        <div className="site-page">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <Text as="p" size="1" color="gray">
          MIT © David Zhang
          <span aria-hidden="true"> · </span>
          <a className="site-footer-link" href={NPM_ORG_URL} target="_blank" rel="noreferrer">
            @pineappleui on npm
          </a>
          <span aria-hidden="true"> · </span>
          <a className="site-footer-link" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub repo
          </a>
          <span aria-hidden="true"> · </span>
          Built on Radix Themes
        </Text>
      </footer>
    </div>
  );
}
