import type { ComponentPropsWithRef } from 'react';

import { Card as RadixCard } from '@radix-ui/themes';

// Inherit the full Radix Card prop surface (size, variant, asChild and the
// margin props) — this Card is an indirection point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Card works transparently.
type RadixCardProps = ComponentPropsWithRef<typeof RadixCard>;

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
// "isn't this a second source of truth?": `RadixCardProps['variant']` is an
// INDEXED ACCESS, so a prop Radix renames or removes is `error TS2339:
// Property … does not exist` here, at build time. The one thing no check
// catches is Radix RETYPING a prop — the overlay follows it silently and stays
// correct, and only the sentence beside it can go stale.
export type CardProps = RadixCardProps & {
  /**
   * Render the child element instead of the `<div>`, so a whole card that navigates or opens
   * something is a real link or button rather than a div with a click handler.
   */
  asChild?: RadixCardProps['asChild'];
  /**
   * The card's internal padding, as a step on the space scale rather than a CSS length. It
   * says nothing about the card's width — that is the layout's job.
   */
  size?: RadixCardProps['size'];
  /** How far the card lifts off the page behind it, from a raised surface down to no decoration. */
  variant?: RadixCardProps['variant'];
};

export function Card(props: CardProps) {
  return <RadixCard {...props} />;
}
