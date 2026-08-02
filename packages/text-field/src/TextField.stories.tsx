import type { ComponentProps } from 'react';

import { ACCENT_COLORS } from '@pineappleui/tokens';

import { TextField } from './TextField';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Sizes() {
  return (
    <div style={{ padding: 24, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['1', '2', '3'] as const).map(s => (
        <TextField.Root key={s} size={s} placeholder={`size ${s}`} />
      ))}
    </div>
  );
}

export function WithSlot() {
  return (
    <div style={{ padding: 24, maxWidth: 360 }}>
      <TextField.Root placeholder="username">
        <TextField.Slot>@</TextField.Slot>
      </TextField.Root>
    </div>
  );
}

// Interactive playground: change size/variant/radius/color from the "Controls"
// form and watch the field update live.
type RootProps = ComponentProps<typeof TextField.Root>;

interface PlaygroundArgs {
  placeholder: string;
  size: NonNullable<RootProps['size']>;
  variant: NonNullable<RootProps['variant']>;
  radius: NonNullable<RootProps['radius']>;
  color: string;
}

export const Playground: Story<PlaygroundArgs> = ({ color, ...rest }) => (
  <div style={{ padding: 24, maxWidth: 360 }}>
    <TextField.Root {...rest} color={(color || undefined) as RootProps['color']} />
  </div>
);

Playground.args = {
  placeholder: 'you@example.com',
};

Playground.argTypes = {
  size: {
    options: ['1', '2', '3'],
    control: { type: 'select' },
    defaultValue: '2',
  },
  variant: {
    options: ['surface', 'classic', 'soft'],
    control: { type: 'select' },
    defaultValue: 'surface',
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
