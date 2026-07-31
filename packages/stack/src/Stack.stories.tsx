import { Stack } from './Stack';

import type { StackProps } from './Stack';

import type { Story } from '@ladle/react';

export function Gaps() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['1', '2', '3', '4', '5'] as const).map(g => (
        <div key={g}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            gap=
            {g}
          </div>
          <Stack gap={g}>
            <div style={{ background: 'var(--gray-3)', padding: 8 }}>A</div>
            <div style={{ background: 'var(--gray-3)', padding: 8 }}>B</div>
          </Stack>
        </div>
      ))}
    </div>
  );
}

// Interactive playground: change gap/align/justify/direction from the
// "Controls" form and watch the column re-lay-out live.
interface PlaygroundArgs {
  gap: string;
  align: NonNullable<StackProps['align']>;
  justify: NonNullable<StackProps['justify']>;
  direction: NonNullable<StackProps['direction']>;
}

export const Playground: Story<PlaygroundArgs> = ({ gap, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Stack gap={gap} {...rest}>
      {['One', 'Two', 'Three'].map(t => (
        <div key={t} style={{ background: 'var(--gray-3)', padding: 8 }}>{t}</div>
      ))}
    </Stack>
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
  direction: {
    options: ['column', 'column-reverse'],
    control: { type: 'select' },
    defaultValue: 'column',
  },
};
