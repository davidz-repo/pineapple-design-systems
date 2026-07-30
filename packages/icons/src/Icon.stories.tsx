import { Icon } from './Icon';

import type { IconName, IconSize } from './Icon';

import type { Story } from '@ladle/react';

// The Ladle gallery workspace that renders these stories lands in a later PR.
// Until it does, the stories are typechecked and linted like any other source
// file here, but there is nothing in this repo that can run them.

const NAMES: IconName[] = [
  'arrow-left-right',
  'captions',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'close',
  'copy',
  'home',
  'mic',
  'mic-off',
  'phone-off',
];

const SIZES: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export function AllIcons() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      {NAMES.map(name => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 88 }}>
          <Icon name={name} size="lg" />
          <span style={{ fontSize: 12, color: 'var(--gray-11)' }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 20, alignItems: 'flex-end' }}>
      {SIZES.map(size => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Icon name="home" size={size} />
          <span style={{ fontSize: 12, color: 'var(--gray-11)' }}>{size}</span>
        </div>
      ))}
    </div>
  );
}

// Interactive playground: pick a glyph/size/color and an optional accessible
// label from the "Controls" form and watch the icon update live.
interface PlaygroundArgs {
  name: IconName;
  size: IconSize;
  color: string;
  label: string;
}

export const Playground: Story<PlaygroundArgs> = ({ name, size, color, label }) => (
  <div style={{ padding: 24, color: color || undefined }}>
    <Icon name={name} size={size} label={label || undefined} />
  </div>
);

Playground.args = {
  label: '',
};

Playground.argTypes = {
  name: {
    options: NAMES,
    control: { type: 'select' },
    defaultValue: 'home',
  },
  size: {
    options: SIZES,
    control: { type: 'select' },
    defaultValue: 'lg',
  },
  color: {
    options: ['', 'var(--indigo-11)', 'var(--red-11)', 'var(--green-11)', 'var(--amber-11)', 'var(--gray-11)'],
    control: { type: 'select' },
    defaultValue: '',
  },
};
