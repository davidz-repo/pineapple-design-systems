// The tabs a package page has: one row per tab, holding every name that tab
// answers to. The router reads `segment`, the tab strip reads `label`, and
// `document.title` reads `titleSuffix` (a title is not a tab label — "Button
// playground", not "Playground").
//
// One list rather than three, because the three used to be two — a segment the
// router served and a title map that had never heard of it titled the page
// "Page not found" while the page itself rendered fine, and nothing failed.
// Adding a tab here is the only edit a new tab needs.
//
// Examples are NOT a tab: they open the Overview, above the README, so the
// first thing a package's page shows is the component running.

export interface PackageTab {
  /** Route segment under `/components/:slug`. `''` is the index tab. */
  segment: string;
  /** What the tab strip calls it. */
  label: string;
  /** Appended to the package name in `document.title`. */
  titleSuffix: string;
}

export const PACKAGE_TABS: readonly PackageTab[] = [
  { segment: '', label: 'Overview', titleSuffix: '' },
  { segment: 'playground', label: 'Playground', titleSuffix: ' playground' },
  { segment: 'changelog', label: 'Changelog', titleSuffix: ' changelog' },
];

/** The route a tab of a package lives at. */
export function tabPath(slug: string, segment: string): string {
  return segment === '' ? `/components/${slug}` : `/components/${slug}/${segment}`;
}
