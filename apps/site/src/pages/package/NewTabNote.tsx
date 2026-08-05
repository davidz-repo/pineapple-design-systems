// Every off-site link on a package page opens a new tab. A sighted reader is
// told by the tab that appears; without this, a screen-reader user is told by
// nothing, and finds out when Back does not go back. It rides in the accessible
// name rather than a `title`, which is announced inconsistently and never on
// touch.
//
// Its own module because two sections say it now — the link row under the title
// (PackageLinks) and the Props section's reference to the primitive underneath
// — and the second copy is where the class silently goes missing: the name
// would still be right, and the note would print itself into the page for
// everyone else.
export function NewTabNote() {
  return <span className="site-visually-hidden"> (opens in a new tab)</span>;
}
