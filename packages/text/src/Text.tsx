import type { ComponentPropsWithRef } from 'react';

import { Text as RadixText } from '@radix-ui/themes';

// Inherit the full Radix Text prop surface (size, weight, color, align,
// trim, truncate, wrap, as, asChild, etc.) — this Text is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed.
export type TextProps = ComponentPropsWithRef<typeof RadixText>;

export function Text(props: TextProps) {
  return <RadixText {...props} />;
}
