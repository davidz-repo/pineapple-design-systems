import { ACCENT_COLORS } from '@pineappleui/tokens';

import { TextArea } from './TextArea';

import type { TextAreaProps } from './TextArea';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

export function Sizes() {
  return (
    <div style={{ padding: 24, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['1', '2', '3'] as const).map(s => (
        <TextArea key={s} size={s} placeholder={`size ${s}`} />
      ))}
    </div>
  );
}

export function Resize() {
  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <TextArea placeholder="resize me" resize="vertical" />
    </div>
  );
}

// Interactive playground: change size/variant/radius/resize from the "Controls"
// form and watch the textarea update live.
interface PlaygroundArgs {
  placeholder: string;
  size: NonNullable<TextAreaProps['size']>;
  variant: NonNullable<TextAreaProps['variant']>;
  radius: NonNullable<TextAreaProps['radius']>;
  resize: NonNullable<TextAreaProps['resize']>;
  color: string;
}

export const Playground: Story<PlaygroundArgs> = ({ color, ...rest }) => (
  <div style={{ padding: 24, maxWidth: 480 }}>
    <TextArea {...rest} color={(color || undefined) as TextAreaProps['color']} />
  </div>
);

Playground.args = {
  placeholder: 'Share your notes…',
};

Playground.argTypes = {
  size: {
    options: ['1', '2', '3'],
    control: { type: 'select' },
    defaultValue: '2',
  },
  variant: {
    options: ['surface', 'classic', 'soft'],
    control: { type: 'select' },
    defaultValue: 'surface',
  },
  radius: {
    options: ['none', 'small', 'medium', 'large', 'full'],
    control: { type: 'select' },
    defaultValue: 'large',
  },
  resize: {
    options: ['none', 'vertical', 'horizontal', 'both'],
    control: { type: 'select' },
    defaultValue: 'none',
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
