import type { ComponentPropsWithRef } from 'react';

import { Card as RadixCard } from '@radix-ui/themes';

// Inherit the full Radix Card prop surface (size, variant, asChild and the
// margin props) — this Card is an indirection point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Card works transparently.
export type CardProps = ComponentPropsWithRef<typeof RadixCard>;

export function Card(props: CardProps) {
  return <RadixCard {...props} />;
}
