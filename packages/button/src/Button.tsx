import type { ComponentPropsWithRef } from 'react';

import { Button as RadixButton } from '@radix-ui/themes';

// Inherit the full Radix Button prop surface (variant, size, color, radius,
// highContrast, loading, asChild, etc.) — this Button is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Button works transparently.
type RadixButtonProps = ComponentPropsWithRef<typeof RadixButton>;

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
// "isn't this a second source of truth?": `RadixButtonProps['loading']` is an
// INDEXED ACCESS, so a prop Radix renames or removes is `error TS2339:
// Property … does not exist` here, at build time. The one thing no check
// catches is Radix RETYPING a prop — the overlay follows it silently and stays
// correct, and only the sentence beside it can go stale.
export type ButtonProps = RadixButtonProps & {
  /**
   * Render the child element instead of a `<button>`, keeping the styling on it — how an
   * action that changes the URL becomes a real `<a>` and keeps middle-click and copy-link.
   */
  asChild?: RadixButtonProps['asChild'];
  /** An accent name that overrides the theme's for this button — a destructive action, say. */
  color?: RadixButtonProps['color'];
  /** Deepen the label against the button's own fill, for a tint that reads lightly. */
  highContrast?: RadixButtonProps['highContrast'];
  /**
   * Swap the label for a spinner and disable the button, so a second click cannot fire
   * mid-request. Pass it while an action is in flight rather than hiding the button.
   */
  loading?: RadixButtonProps['loading'];
  /** Override the theme's corner rounding for this button alone. */
  radius?: RadixButtonProps['radius'];
  /** Height, padding and label size in one step, so controls on a row line up. */
  size?: RadixButtonProps['size'];
  /** How much weight the button carries — the ladder from the one primary action down to a bare control. */
  variant?: RadixButtonProps['variant'];
};

export function Button(props: ButtonProps) {
  return <RadixButton {...props} />;
}
