import type { ComponentPropsWithRef } from 'react';

import { IconButton as RadixIconButton } from '@radix-ui/themes';

// Inherit the full Radix IconButton prop surface (variant, size, color,
// radius, highContrast, loading, asChild, etc.) — this IconButton is an
// indirection point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based IconButton works transparently.
type RadixIconButtonProps = ComponentPropsWithRef<typeof RadixIconButton>;

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
// "isn't this a second source of truth?": `RadixIconButtonProps['loading']` is an
// INDEXED ACCESS, so a prop Radix renames or removes is `error TS2339:
// Property … does not exist` here, at build time. The one thing no check
// catches is Radix RETYPING a prop — the overlay follows it silently and stays
// correct, and only the sentence beside it can go stale.
//
// The one prop this control cannot do without — an accessible name, since a
// glyph reads as nothing — is React's own `aria-label`, so it is not in the
// table below and the README's contract is where it is stated.
export type IconButtonProps = RadixIconButtonProps & {
  /** Render the child element instead of a `<button>`, for a glyph-only control that navigates. */
  asChild?: RadixIconButtonProps['asChild'];
  /** An accent name that overrides the theme's for this control — a destructive action, say. */
  color?: RadixIconButtonProps['color'];
  /** Deepen the glyph against the control's own fill, for a tint that reads lightly. */
  highContrast?: RadixIconButtonProps['highContrast'];
  /**
   * Swap the glyph for a spinner and disable the control, so a second click cannot fire
   * mid-request. Pass it while an action is in flight rather than hiding the control.
   */
  loading?: RadixIconButtonProps['loading'];
  /** Override the theme's corner rounding for this control alone. */
  radius?: RadixIconButtonProps['radius'];
  /**
   * The square's edge and the inset around the glyph, in one step. It does not scale the glyph
   * itself — the icon is the child you pass, and it carries its own size.
   */
  size?: RadixIconButtonProps['size'];
  /** How much weight the control carries, from a filled square down to a bare glyph. */
  variant?: RadixIconButtonProps['variant'];
};

export function IconButton(props: IconButtonProps) {
  return <RadixIconButton {...props} />;
}
