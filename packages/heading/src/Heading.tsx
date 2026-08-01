import type { ComponentPropsWithRef } from 'react';

import { Heading as RadixHeading } from '@radix-ui/themes';

// Inherit the full Radix Heading prop surface (as, size, weight, align, color,
// trim, truncate, wrap, highContrast, etc.) — this Heading is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Heading works transparently.
export type HeadingProps = ComponentPropsWithRef<typeof RadixHeading>;

// Map each heading level to a default type-scale size, so `<Heading as="hN">`
// renders at a visibly distinct size out of the box. Radix's `as` only sets the
// semantic tag (not the visual size), which is why unstyled h1–h6 all look the
// same. An explicit `size` always wins; a bare <Heading> (no `as`) keeps Radix's
// own default size.
const LEVEL_SIZE = {
  h1: '8',
  h2: '7',
  h3: '6',
  h4: '5',
  h5: '4',
  h6: '3',
} satisfies Record<string, HeadingProps['size']>;

export function Heading({ as, size, ...props }: HeadingProps) {
  const resolvedSize = size ?? (as ? LEVEL_SIZE[as] : undefined);
  return <RadixHeading as={as} size={resolvedSize} {...props} />;
}
