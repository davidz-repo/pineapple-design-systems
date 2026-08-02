import { Icon } from '@pineappleui/icons';
import { ACCENT_COLORS } from '@pineappleui/tokens';

import { IconButton } from './IconButton';

import type { IconButtonProps } from './IconButton';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.
//
// The glyph comes from @pineappleui/icons — the icon package of this same
// design system, and a devDependency here for the stories only. It is
// decorative by default, so every button below carries its own aria-label:
// an icon-only control with no accessible name is a button that reads as
// "button" to a screen reader.

export function Variants() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <IconButton aria-label="Copy (classic)" variant="classic">
        <Icon name="copy" />
      </IconButton>
      <IconButton aria-label="Copy (solid)" variant="solid">
        <Icon name="copy" />
      </IconButton>
      <IconButton aria-label="Copy (soft)" variant="soft">
        <Icon name="copy" />
      </IconButton>
      <IconButton aria-label="Copy (surface)" variant="surface">
        <Icon name="copy" />
      </IconButton>
      <IconButton aria-label="Copy (outline)" variant="outline">
        <Icon name="copy" />
      </IconButton>
      <IconButton aria-label="Copy (ghost)" variant="ghost">
        <Icon name="copy" />
      </IconButton>
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <IconButton aria-label="Loading" loading>
        <Icon name="copy" />
      </IconButton>
    </div>
  );
}

// Interactive playground: change variant/size/radius/etc. from the "Controls"
// form and watch the icon button update live.
interface PlaygroundArgs {
  variant: NonNullable<IconButtonProps['variant']>;
  size: NonNullable<IconButtonProps['size']>;
  radius: NonNullable<IconButtonProps['radius']>;
  color: string;
  highContrast: boolean;
  loading: boolean;
  disabled: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ color, ...rest }) => (
  <div style={{ padding: 24 }}>
    <IconButton
      aria-label="Copy"
      {...rest}
      color={(color || undefined) as IconButtonProps['color']}
    >
      <Icon name="copy" />
    </IconButton>
  </div>
);

Playground.args = {
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
