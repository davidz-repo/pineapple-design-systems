import type { ComponentPropsWithRef } from 'react';

import { Badge as RadixBadge } from '@radix-ui/themes';

// Inherit the full Radix Badge prop surface (size, variant, color, radius,
// highContrast). React 19 ref-as-prop pattern.
type RadixBadgeProps = ComponentPropsWithRef<typeof RadixBadge>;

// The members below re-declare props only to hang a description on each: the
// same type read straight back off the Radix props, so nothing is narrowed,
// renamed or defaulted here, and a prop Radix adds later still arrives through
// the intersection without being listed. Radix's own defaults survive too —
// they are read from its declaration, which the intersection keeps beside this
// one. They are written because Radix ships no JSDoc on its component prop
// defs and the docs site builds its tables from these types: without them the
// Description column is empty on every row of this package's table.
//
// The restatement is CHECKED rather than trusted, which is the answer to
// "isn't this a second source of truth?": `RadixBadgeProps['variant']` is an
// INDEXED ACCESS, so a prop Radix renames or removes is `error TS2339:
// Property … does not exist` here, at build time. The one thing no check
// catches is Radix RETYPING a prop — the overlay follows it silently and stays
// correct, and only the sentence beside it can go stale.
export type BadgeProps = RadixBadgeProps & {
  /** Render the child element instead of the `<span>`, with the badge's styling on it. */
  asChild?: RadixBadgeProps['asChild'];
  /** An accent name that overrides the theme's for this badge; omit it to inherit the app's. */
  color?: RadixBadgeProps['color'];
  /** Deepen the label against the badge's own fill, for a tint that reads lightly. */
  highContrast?: RadixBadgeProps['highContrast'];
  /** Override the theme's corner rounding for this badge alone. */
  radius?: RadixBadgeProps['radius'];
  /** Text size and padding in one step, so badges across an app share a rhythm. */
  size?: RadixBadgeProps['size'];
  /** How loudly the badge sits on the surface behind it, from a filled block down to an outline. */
  variant?: RadixBadgeProps['variant'];
};

export function Badge(props: BadgeProps) {
  return <RadixBadge {...props} />;
}
