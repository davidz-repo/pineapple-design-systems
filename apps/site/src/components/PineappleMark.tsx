// The site's brand mark. Site-local on purpose, and NOT in @pineappleui/icons:
// that package is a Lucide vocabulary (ICON_NAMES), and a one-off logo is not a
// member of it. A workspace of its own would be worse still — the registry
// asserts packages/* and the site's package list against each other in both
// directions, so a package nobody documents fails registry.test.ts.
//
// Three flat layers, no gradients and no opacity, so the shape survives being
// scaled down and reads at the 24px the header renders it at:
//
//   1. the crown — ONE triangle blade, drawn three times, rotated ±40° about
//      the point where all three meet the body (16, 10). One path and two
//      transforms rather than three hand-fitted paths: the blades cannot drift
//      out of symmetry, because there is only one of them.
//   2. the body, painted OVER the crown so the blade bases tuck under its
//      shoulder instead of ending in a visible seam.
//   3. the lattice — one diamond pip, placed seven times in three rows and
//      clipped to the body. The outer pips of the middle row deliberately
//      overhang; the clip shaves them, which is what makes the texture follow
//      the body's curve instead of stopping short of it in a straight line.
//
// Colours are custom properties, so the mark follows the theme (site.css owns
// --site-brand and --site-mark-texture, and both have a dark-appearance value).
// The favicon and the OG card are the same drawing in literal hex — nothing
// fetched outside the document has a custom property in scope — so a change
// here is a change in all three files.
//
// The two ids are document-global, which is safe because they name geometry
// rather than state: a second instance would resolve `url(#pineapple-mark-body)`
// to the first one's clip path, which is the identical rectangle. The header
// renders exactly one.

// The one blade, and the one body outline. Each is written once and used
// several times — the body is both the painted shape and the lattice's clip, so
// a copy of it is a clip that stops agreeing with the thing it clips.
const CROWN_BLADE = 'M16 2 L19 10 L13 10 Z';
const BODY = { x: 8, y: 9, width: 16, height: 20, rx: 7 } as const;

export function PineappleMark() {
  return (
    // aria-hidden, because the wordmark beside it is already the link's
    // accessible name — announcing "Pineapple UI, Pineapple UI" is what an
    // alt-texted logo next to its own wordmark actually does. focusable="false"
    // keeps legacy IE/Edge from putting the <svg> in the tab order.
    <svg
      className="site-brand-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="pineapple-mark-body">
          <rect {...BODY} />
        </clipPath>
        <path id="pineapple-mark-pip" d="M0 -3 L2.5 0 L0 3 L-2.5 0 Z" />
      </defs>

      <g fill="var(--site-brand)">
        <path d={CROWN_BLADE} />
        <path d={CROWN_BLADE} transform="rotate(-40 16 10)" />
        <path d={CROWN_BLADE} transform="rotate(40 16 10)" />
      </g>

      <rect {...BODY} fill="var(--amber-9)" />

      <g clipPath="url(#pineapple-mark-body)" fill="var(--site-mark-texture)">
        <use href="#pineapple-mark-pip" x="12.5" y="14" />
        <use href="#pineapple-mark-pip" x="19.5" y="14" />
        <use href="#pineapple-mark-pip" x="10" y="19" />
        <use href="#pineapple-mark-pip" x="16" y="19" />
        <use href="#pineapple-mark-pip" x="22" y="19" />
        <use href="#pineapple-mark-pip" x="12.5" y="24" />
        <use href="#pineapple-mark-pip" x="19.5" y="24" />
      </g>
    </svg>
  );
}
