import { bySlug } from '../registry';

// What counts as "a different page" for the shell's route-change behavior
// (scroll to top, move focus to #main, retitle the document), and what that
// page is called.
//
// Keyed off the PATHNAME and nothing else, deliberately:
//   - the four tabs of a package page share one key, so switching Overview ->
//     Playground does not scroll the reader back to the top or re-announce the
//     page they are already on;
//   - search params are not part of the key, so a playground writing its args
//     into the URL cannot masquerade as navigation.
//
// A slug this site does not know is not special-cased: it falls through to the
// not-found title, which is what `PackagePage` renders for it.

const SITE_NAME = 'Pineapple UI';
const COMPONENT_PREFIX = '/components/';

/**
 * The identity of the page a pathname lands on. Equal keys mean "the same
 * page" — the value itself is opaque and is only ever compared or passed to
 * {@link pageTitleFor}.
 */
export function pageKeyFor(pathname: string): string {
  if (!pathname.startsWith(COMPONENT_PREFIX)) {
    return pathname;
  }
  const [slug = ''] = pathname.slice(COMPONENT_PREFIX.length).split('/');
  return `${COMPONENT_PREFIX}${slug}`;
}

/** The `document.title` for a key from {@link pageKeyFor}. */
export function pageTitleFor(pageKey: string): string {
  if (pageKey === '/') {
    return `${SITE_NAME} — React design system`;
  }
  if (pageKey === '/getting-started') {
    return `Getting started — ${SITE_NAME}`;
  }
  const entry = pageKey.startsWith(COMPONENT_PREFIX)
    ? bySlug.get(pageKey.slice(COMPONENT_PREFIX.length))
    : undefined;
  return entry === undefined
    ? `Page not found — ${SITE_NAME}`
    : `${entry.name} — ${SITE_NAME}`;
}
