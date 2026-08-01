import { ACCENT_COLORS } from '@pineappleui/tokens';

import { Text } from './Text';

import type { TextProps } from './Text';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Sizes() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map(s => (
        <Text key={s} size={s}>
          Size
          {' '}
          {s}
          : the quick brown fox
        </Text>
      ))}
    </div>
  );
}

export function Weights() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['light', 'regular', 'medium', 'bold'] as const).map(w => (
        <Text key={w} weight={w} size="4">
          {w}
          : the quick brown fox
        </Text>
      ))}
    </div>
  );
}

// Interactive playground: change size/weight/align/color from the "Controls"
// form and watch the text update live.
interface PlaygroundArgs {
  text: string;
  size: NonNullable<TextProps['size']>;
  weight: NonNullable<TextProps['weight']>;
  align: NonNullable<TextProps['align']>;
  color: string;
  highContrast: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ text, color, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Text {...rest} color={(color || undefined) as TextProps['color']}>
      {text}
    </Text>
  </div>
);

Playground.args = {
  text: 'The quick brown fox jumps over the lazy dog.',
  highContrast: false,
};

Playground.argTypes = {
  size: {
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    control: { type: 'select' },
    defaultValue: '3',
  },
  weight: {
    options: ['light', 'regular', 'medium', 'bold'],
    control: { type: 'select' },
    defaultValue: 'regular',
  },
  align: {
    options: ['left', 'center', 'right'],
    control: { type: 'select' },
    defaultValue: 'left',
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
