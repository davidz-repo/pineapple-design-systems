import { Card } from './Card';

import type { CardProps } from './Card';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Variants() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
      <Card variant="surface">surface</Card>
      <Card variant="classic">classic</Card>
      <Card variant="ghost">ghost</Card>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
      {(['1', '2', '3', '4', '5'] as const).map(s => (
        <Card key={s} size={s}>
          size
          {s}
        </Card>
      ))}
    </div>
  );
}

// Interactive playground: change variant/size from the "Controls" form and
// watch the card update live.
interface PlaygroundArgs {
  content: string;
  variant: NonNullable<CardProps['variant']>;
  size: NonNullable<CardProps['size']>;
}

export const Playground: Story<PlaygroundArgs> = ({ content, ...rest }) => (
  <div style={{ padding: 24, maxWidth: 360 }}>
    <Card {...rest}>{content}</Card>
  </div>
);

Playground.args = {
  content: 'Card body content goes here.',
};

Playground.argTypes = {
  variant: {
    options: ['surface', 'classic', 'ghost'],
    control: { type: 'select' },
    defaultValue: 'surface',
  },
  size: {
    options: ['1', '2', '3', '4', '5'],
    control: { type: 'select' },
    defaultValue: '1',
  },
};
