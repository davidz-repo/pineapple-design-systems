import type { ComponentPropsWithRef } from 'react';

import { Box as RadixBox } from '@radix-ui/themes';

export type BoxProps = ComponentPropsWithRef<typeof RadixBox>;

export function Box(props: BoxProps) {
  return <RadixBox {...props} />;
}
