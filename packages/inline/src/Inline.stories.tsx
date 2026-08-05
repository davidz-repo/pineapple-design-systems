import { Inline } from './Inline';

import type { InlineProps } from './Inline';

import type { Story } from '@ladle/react';

export function Wrapping() {
  return (
    <div style={{ padding: 24, maxWidth: 300 }}>
      <Inline gap="2">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ background: 'var(--accent-a3)', padding: 8 }}>{`item-${i}`}</div>
        ))}
      </Inline>
    </div>
  );
}

export function Aligned() {
  return (
    <div style={{ padding: 24 }}>
      <Inline gap="3" align="center">
        <div style={{ background: 'var(--accent-a3)', padding: 8, height: 40 }}>tall</div>
        <div style={{ background: 'var(--accent-a3)', padding: 8, height: 20 }}>short</div>
        <div style={{ background: 'var(--accent-a3)', padding: 8, height: 60 }}>taller</div>
      </Inline>
    </div>
  );
}

// Interactive playground: change gap/align/justify/wrap/direction from the
// "Controls" form and watch the row re-lay-out live.
interface PlaygroundArgs {
  gap: string;
  align: NonNullable<InlineProps['align']>;
  justify: NonNullable<InlineProps['justify']>;
  wrap: NonNullable<InlineProps['wrap']>;
  direction: NonNullable<InlineProps['direction']>;
}

export const Playground: Story<PlaygroundArgs> = ({ gap, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Inline gap={gap} {...rest}>
      {['One', 'Two', 'Three', 'Four'].map(t => (
        <div key={t} style={{ background: 'var(--accent-a3)', padding: 8 }}>{t}</div>
      ))}
    </Inline>
  </div>
);

Playground.argTypes = {
  gap: {
    options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    control: { type: 'select' },
    defaultValue: '2',
  },
  align: {
    options: ['start', 'center', 'end', 'baseline', 'stretch'],
    control: { type: 'select' },
    defaultValue: 'stretch',
  },
  justify: {
    options: ['start', 'center', 'end', 'between'],
    control: { type: 'select' },
    defaultValue: 'start',
  },
  wrap: {
    options: ['nowrap', 'wrap', 'wrap-reverse'],
    control: { type: 'select' },
    defaultValue: 'wrap',
  },
  direction: {
    options: ['row', 'row-reverse'],
    control: { type: 'select' },
    defaultValue: 'row',
  },
};
