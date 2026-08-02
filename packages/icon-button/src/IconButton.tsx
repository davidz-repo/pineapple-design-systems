import type { ComponentPropsWithRef } from 'react';

import { IconButton as RadixIconButton } from '@radix-ui/themes';

// Inherit the full Radix IconButton prop surface (variant, size, color,
// radius, highContrast, loading, asChild, etc.) — this IconButton is an
// indirection point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based IconButton works transparently.
export type IconButtonProps = ComponentPropsWithRef<typeof RadixIconButton>;

export function IconButton(props: IconButtonProps) {
  return <RadixIconButton {...props} />;
}
