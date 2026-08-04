import type { AccentColor } from '@pineappleui/tokens';

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
 * It is imported by BOTH surfaces that paint the theme, which is why it is a
 * module of its own rather than a literal in either:
 *
 *   - `main.tsx` passes it to `DesignSystemProvider`, which is React
 *   - `vite.config.ts` passes it to `getFoucScript`, which runs before React
 *
 * Those two must agree. A pair that disagrees is not an error anywhere — the
 * page paints one accent, then snaps to the other a frame later, which is the
 * flash the boot script is inlined to prevent. Two literals in two files is how
 * that happens; one exported constant is how it cannot.
 */
export const SITE_ACCENT_COLOR: AccentColor = 'amber';
