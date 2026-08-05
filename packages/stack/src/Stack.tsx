import type { ComponentPropsWithRef } from 'react';

import { Flex } from '@radix-ui/themes';

// Stack = vertical Flex. We constrain `direction` to column variants only so
// the primitive's name matches its behavior; consumers who need horizontal
// layout should reach for @pineappleui/inline instead.
type FlexProps = ComponentPropsWithRef<typeof Flex>;
export type StackProps = Omit<FlexProps, 'direction'> & {
  /**
   * Down the page, or up it. A row is not on offer here — that is what keeps this primitive's
   * name honest, and `@pineappleui/inline` is the one that goes across.
   */
  direction?: 'column' | 'column-reverse';
};

export function Stack({ direction = 'column', ...rest }: StackProps) {
  return <Flex direction={direction} {...rest} />;
}
