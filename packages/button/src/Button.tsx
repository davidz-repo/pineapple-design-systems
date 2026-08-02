import type { ComponentPropsWithRef } from 'react';

import { Button as RadixButton } from '@radix-ui/themes';

// Inherit the full Radix Button prop surface (variant, size, color, radius,
// highContrast, loading, asChild, etc.) — this Button is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Button works transparently.
export type ButtonProps = ComponentPropsWithRef<typeof RadixButton>;

export function Button(props: ButtonProps) {
  return <RadixButton {...props} />;
}
