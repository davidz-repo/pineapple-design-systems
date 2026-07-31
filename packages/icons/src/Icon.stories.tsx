import { Icon } from './Icon';
import { ICON_NAMES, ICON_SIZES } from './vocabulary';

import type { IconName, IconSize } from './vocabulary';

import type { Story } from '@ladle/react';

// The Ladle gallery workspace that renders these stories lands in a later PR.
// Until it does, the stories are typechecked and linted like any other source
// file here, but there is nothing in this repo that can run them.
//
// The gallery maps over the exported ICON_NAMES / ICON_SIZES rather than lists
// of its own: a glyph added to the map shows up here without anyone remembering
// to add it, which is the whole point of exporting them.

export function AllIcons() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      {ICON_NAMES.map(name => (
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
      {ICON_SIZES.map(size => (
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
    options: ICON_NAMES,
    control: { type: 'select' },
    defaultValue: 'home',
  },
  size: {
    options: ICON_SIZES,
    control: { type: 'select' },
    defaultValue: 'lg',
  },
  color: {
    options: ['', 'var(--indigo-11)', 'var(--red-11)', 'var(--green-11)', 'var(--amber-11)', 'var(--gray-11)'],
    control: { type: 'select' },
    defaultValue: '',
  },
};
