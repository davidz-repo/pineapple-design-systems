import { Button } from './Button';

import type { ButtonProps } from './Button';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

// Interactive playground: every knob is wired to a Ladle control so you can
// change variant/size/radius/etc. from the "Controls" form in the sidebar and
// watch the button update live — useful while tuning the defaults.
//
// No `color` knob. `Button` still takes the prop — this is what the playground
// OFFERS, not what the component supports — but the two surfaces that render
// these stories both answer the accent question themselves: the docs site pins
// one accent for the whole page, and the gallery has a picker in its own
// toolbar that repaints the entire frame. A third control for the same thing,
// scoped to one button, disagrees with both.
interface PlaygroundArgs {
  label: string;
  variant: NonNullable<ButtonProps['variant']>;
  size: NonNullable<ButtonProps['size']>;
  radius: NonNullable<ButtonProps['radius']>;
  highContrast: boolean;
  loading: boolean;
  disabled: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ label, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Button {...rest}>{label}</Button>
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
