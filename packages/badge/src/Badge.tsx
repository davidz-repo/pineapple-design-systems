import type { ComponentPropsWithRef } from 'react';

import { Badge as RadixBadge } from '@radix-ui/themes';

// Inherit the full Radix Badge prop surface (size, variant, color, radius,
// highContrast). React 19 ref-as-prop pattern.
export type BadgeProps = ComponentPropsWithRef<typeof RadixBadge>;

export function Badge(props: BadgeProps) {
  return <RadixBadge {...props} />;
}
