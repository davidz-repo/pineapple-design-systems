import type { ComponentPropsWithRef } from 'react';

import { TextArea as RadixTextArea } from '@radix-ui/themes';

// Inherit the full Radix TextArea prop surface (size, variant, color, radius,
// resize, etc.). React 19 ref-as-prop pattern.
export type TextAreaProps = ComponentPropsWithRef<typeof RadixTextArea>;

export function TextArea(props: TextAreaProps) {
  return <RadixTextArea {...props} />;
}
