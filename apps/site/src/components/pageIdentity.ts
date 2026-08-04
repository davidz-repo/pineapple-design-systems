import { PACKAGE_TABS } from '../packageTabs';
import { bySlug } from '../registry';

// What counts as "a different page" for the shell's route-change behavior
// (scroll to top, move focus to #main), and what the document is called.
//
// The two answers deliberately differ in how much of the URL they read:
//
//   - the KEY collapses the tabs of a package page onto one value, so
//     switching Overview -> Playground does not scroll the reader back to the
//     top or re-announce a page they never left;
//   - the TITLE names the tab, because a title is what a browser history
//     entry, a bookmark and a window switcher show, and four entries reading
//     "Button — Pineapple UI" are four entries nobody can tell apart.
//
// Both read the pathname and nothing else: search params are not part of
// either, so a playground writing its args into the URL cannot masquerade as
// navigation or rewrite the title on every keystroke.
//
// A slug this site does not know falls through to the not-found title, which
// is what `PackagePage` renders for it.

const SITE_NAME = 'Pineapple UI';
const COMPONENT_PREFIX = '/components/';

// Derived from the tab list itself, not a second copy of it: a segment the
// router serves but this map had never heard of used to title a working page
// "Page not found", and no test could see the disagreement because there was
// nothing that said the two lists were supposed to match. Now there is one list.
//
// The one case this cannot see: a tab a package does not HAVE (there is no
// `/components/tokens/playground` because tokens exports no stories). Knowing
// that means resolving the story module, which is async and route-level; the
// page says so in place of the tab's content while the title names the tab.
// Rare, and cheaper than making the title wait on a dynamic import.
const TAB_TITLES: Record<string, string> = Object.fromEntries(
  PACKAGE_TABS.map(tab => [tab.segment, tab.titleSuffix]),
);

// `/getting-started/` is the same route as `/getting-started` to the router,
// so it is the same page and the same title here.
function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
}

/**
 * The identity of the page a pathname lands on. Equal keys mean "the same
 * page" — the value itself is opaque and is only ever compared.
 */
export function pageKeyFor(rawPathname: string): string {
  const pathname = withoutTrailingSlash(rawPathname);
  if (!pathname.startsWith(COMPONENT_PREFIX)) {
    return pathname;
  }
  const [slug = ''] = pathname.slice(COMPONENT_PREFIX.length).split('/');
  return `${COMPONENT_PREFIX}${slug}`;
}

/** The `document.title` for a pathname, tab included. */
export function pageTitleFor(rawPathname: string): string {
  const pathname = withoutTrailingSlash(rawPathname);
  if (pathname === '/') {
    return `${SITE_NAME} — React design system`;
  }
  if (pathname === '/getting-started') {
    return `Getting started — ${SITE_NAME}`;
  }

  const notFound = `Page not found — ${SITE_NAME}`;
  if (!pathname.startsWith(COMPONENT_PREFIX)) {
    return notFound;
  }

  const [slug = '', tab = '', ...rest] = pathname.slice(COMPONENT_PREFIX.length).split('/');
  const entry = bySlug.get(slug);
  const tabTitle = TAB_TITLES[tab];
  if (entry === undefined || tabTitle === undefined || rest.length > 0) {
    return notFound;
  }
  return `${entry.name}${tabTitle} — ${SITE_NAME}`;
}
