import { ACCENT_COLORS } from '@pineappleui/tokens';

import { Heading } from './Heading';

import type { HeadingProps } from './Heading';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Levels() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Heading as="h1">Heading h1</Heading>
      <Heading as="h2">Heading h2</Heading>
      <Heading as="h3">Heading h3</Heading>
      <Heading as="h4">Heading h4</Heading>
      <Heading as="h5">Heading h5</Heading>
      <Heading as="h6">Heading h6</Heading>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Heading size="1">Heading size 1</Heading>
      <Heading size="2">Heading size 2</Heading>
      <Heading size="3">Heading size 3</Heading>
      <Heading size="4">Heading size 4</Heading>
      <Heading size="5">Heading size 5</Heading>
      <Heading size="6">Heading size 6</Heading>
      <Heading size="7">Heading size 7</Heading>
      <Heading size="8">Heading size 8</Heading>
      <Heading size="9">Heading size 9</Heading>
    </div>
  );
}

// Interactive playground: change level/size/weight/align/color from the
// "Controls" form and watch the heading update live.
interface PlaygroundArgs {
  text: string;
  as: NonNullable<HeadingProps['as']>;
  size: NonNullable<HeadingProps['size']>;
  weight: NonNullable<HeadingProps['weight']>;
  align: NonNullable<HeadingProps['align']>;
  color: string;
  highContrast: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ text, color, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Heading {...rest} color={(color || undefined) as HeadingProps['color']}>
      {text}
    </Heading>
  </div>
);

Playground.args = {
  text: 'Every heading is a promise about what follows',
  highContrast: false,
};

Playground.argTypes = {
  as: {
    options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    control: { type: 'select' },
    defaultValue: 'h1',
  },
  size: {
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    control: { type: 'select' },
    defaultValue: '6',
  },
  weight: {
    options: ['light', 'regular', 'medium', 'bold'],
    control: { type: 'select' },
    defaultValue: 'bold',
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
