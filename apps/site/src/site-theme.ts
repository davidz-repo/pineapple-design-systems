import type { Scaling } from '@pineappleui/theme';
import type { AccentColor } from '@pineappleui/tokens';

/**
 * The theme values this site PINS, rather than reads from a preference.
 *
 * Both are the same kind of thing and carry the same rule, which is why they
 * share a module: each is passed to two surfaces that paint independently —
 * `main.tsx` (React) and `vite.config.ts` (the boot script, before React) —
 * and a pair that disagrees is not an error anywhere. It is one frame of the
 * wrong thing followed by a snap, which is the flash the boot script is
 * inlined to prevent. Two literals in two files is how that happens; one
 * exported constant is how it cannot. `site-theme.test.tsx` holds both pairs.
 */

/**
 * The one accent this site paints, everywhere, for everyone.
 *
 * The site has no accent picker (see `ThemeControls`), and site.css derives the
 * whole pineapple palette from this scale — the yellow canvas, the green
 * wordmark measured against it, the mark's own body. A reader arriving with a
 * different accent stored from before the picker was removed would otherwise
 * get that one: a stored accent is still a valid accent, so the package's
 * default never reaches them.
 *
 * See the note above for why it lives here and not as a literal in either
 * surface.
 */
export const SITE_ACCENT_COLOR: AccentColor = 'amber';

/**
 * The scale this site draws everything at.
 *
 * A step up from Radix's 100% default, because the site read small: this is
 * the dial that grows type AND space together, so every ratio the layout was
 * built on survives — the 248px sidebar column, the header token derived from
 * --line-height-2, the nav label that must not wrap. Bumping each `size` prop
 * instead would grow the type and leave the space behind it, which is the same
 * layout with tighter text rather than a larger one.
 *
 * Unlike the accent this is not a preference on any surface — nothing stores
 * it, nothing offers it — but it is still painted twice, and it is the pin
 * that moves LAYOUT rather than colour: disagreement here reflows the whole
 * page a frame in.
 */
export const SITE_SCALING: Scaling = '110%';
