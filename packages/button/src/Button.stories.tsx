import { ACCENT_COLORS } from '@pineappleui/tokens';

import { Button } from './Button';

import type { ButtonProps } from './Button';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

// Interactive playground: every knob is wired to a Ladle control so you can
// change variant/size/radius/etc. from the "Controls" form in the sidebar and
// watch the button update live — useful while tuning the defaults.
interface PlaygroundArgs {
  label: string;
  variant: NonNullable<ButtonProps['variant']>;
  size: NonNullable<ButtonProps['size']>;
  radius: NonNullable<ButtonProps['radius']>;
  color: string;
  highContrast: boolean;
  loading: boolean;
  disabled: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({
  label,
  color,
  ...rest
}) => (
  <div style={{ padding: 24 }}>
    <Button {...rest} color={(color || undefined) as ButtonProps['color']}>
      {label}
    </Button>
  </div>
);

Playground.args = {
  label: 'Click me',
  highContrast: false,
  loading: false,
  disabled: false,
};

Playground.argTypes = {
  variant: {
    options: ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost'],
    control: { type: 'select' },
    defaultValue: 'solid',
  },
  size: {
    options: ['1', '2', '3', '4'],
    control: { type: 'select' },
    defaultValue: '2',
  },
  radius: {
    options: ['none', 'small', 'medium', 'large', 'full'],
    control: { type: 'select' },
    defaultValue: 'large',
  },
  // '' is "inherit the theme accent"; 'gray' is Radix's neutral scale, which is
  // not an accent and so is not in ACCENT_COLORS. The accents themselves are
  // read from @pineappleui/tokens rather than retyped — a hand-written copy of
  // that list is what shipped a picker missing `bronze` upstream.
  color: {
    options: ['', 'gray', ...ACCENT_COLORS],
    control: { type: 'select' },
    defaultValue: '',
  },
};

export function Variants() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button variant="classic">Classic</Button>
      <Button variant="solid">Solid</Button>
      <Button variant="soft">Soft</Button>
      <Button variant="surface">Surface</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Button loading>Loading</Button>
    </div>
  );
}
