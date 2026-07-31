import { Box } from './Box';

import type { Story } from '@ladle/react';

export function Padded() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(['1', '2', '3', '4', '5'] as const).map(p => (
        <Box key={p} p={p} style={{ background: 'var(--gray-3)' }}>
          p=
          {p}
        </Box>
      ))}
    </div>
  );
}

// Interactive playground: tune the padding scale (and an optional fixed width)
// from the "Controls" form and watch the box reflow live.
interface PlaygroundArgs {
  content: string;
  p: string;
  width: string;
}

export const Playground: Story<PlaygroundArgs> = ({ content, p, width }) => (
  <div style={{ padding: 24 }}>
    <Box
      p={p}
      width={width || undefined}
      style={{ background: 'var(--gray-3)' }}
    >
      {content}
    </Box>
  </div>
);

Playground.args = {
  content: 'A Box with padding and a background.',
  width: '',
};

Playground.argTypes = {
  p: {
    options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    control: { type: 'select' },
    defaultValue: '4',
  },
};
