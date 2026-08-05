import type { ComponentPropsWithRef } from 'react';

import { Flex } from '@radix-ui/themes';

// Inline = horizontal Flex with sensible defaults for wrapping rows of items.
// Constrains `direction` to row variants and defaults `wrap` to 'wrap' so
// long rows reflow instead of overflowing.
type FlexProps = ComponentPropsWithRef<typeof Flex>;
export type InlineProps = Omit<FlexProps, 'direction'> & {
  /**
   * Along the reading direction, or back against it. A column is not on offer here — that is
   * what keeps this primitive's name honest, and `@pineappleui/stack` is the one that goes down
   * the page.
   */
  direction?: 'row' | 'row-reverse';
};

export function Inline({ direction = 'row', wrap = 'wrap', ...rest }: InlineProps) {
  return <Flex direction={direction} wrap={wrap} {...rest} />;
}
