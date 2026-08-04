// What a tab shows while its content is on the way. Bars in the shape of the
// prose that replaces them, rather than the word "Loading…": the page keeps its
// height, so the footer does not walk up the screen and back down again.
//
// Decorative, and marked as such. A skeleton has nothing to say to a screen
// reader — the tab link the reader just activated carries `aria-busy` while it
// loads, and the live region on the package page names the tab once it lands.
// An `aria-hidden` fallback is silence for a moment; a labelled one is a second
// announcement competing with the one that is actually about to be useful.

export function TabSkeleton() {
  return (
    <div className="tab-skeleton" aria-hidden="true">
      <span className="skeleton-line" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
    </div>
  );
}

// The first load of a package page, where the tab strip is not up yet either:
// which tabs exist depends on what the package's story module exports, so the
// strip waits on the same import its content does. The bar stands in for it so
// the content below does not jump a row when it arrives.
export function PackageTabsSkeleton() {
  return (
    <div className="tab-skeleton" aria-hidden="true">
      <span className="skeleton-tabs" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
    </div>
  );
}
