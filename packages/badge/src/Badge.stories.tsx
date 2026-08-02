import { ACCENT_COLORS } from '@pineappleui/tokens';

import { Badge } from './Badge';

import type { BadgeProps } from './Badge';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Variants() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge variant="solid">solid</Badge>
      <Badge variant="soft">soft</Badge>
      <Badge variant="surface">surface</Badge>
      <Badge variant="outline">outline</Badge>
    </div>
  );
}

// Maps over the real accent list rather than a copy of it, so an accent added
// to @pineappleui/tokens shows up here without anyone remembering to add it.
export function Colors() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ACCENT_COLORS.map(c => (
        <Badge key={c} color={c}>{c}</Badge>
      ))}
    </div>
  );
}

// Interactive playground: every knob is wired to a Ladle control so you can
// change variant/size/radius/etc. from the "Controls" form and watch the badge
// update live.
interface PlaygroundArgs {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  size: NonNullable<BadgeProps['size']>;
  radius: NonNullable<BadgeProps['radius']>;
  color: string;
  highContrast: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ label, color, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Badge {...rest} color={(color || undefined) as BadgeProps['color']}>
      {label}
    </Badge>
  </div>
);

Playground.args = {
  label: 'New',
  highContrast: false,
};

Playground.argTypes = {
  variant: {
    options: ['solid', 'soft', 'surface', 'outline'],
    control: { type: 'select' },
    defaultValue: 'soft',
  },
  size: {
    options: ['1', '2', '3'],
    control: { type: 'select' },
    defaultValue: '1',
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
