import { Button } from './Button';

import type { ButtonProps } from './Button';

import type { Story } from '@ladle/react';

// These stories assume Radix's <Theme> is in scope, which the Ladle gallery's
// global decorator supplies. That workspace lands in a later PR, so nothing in
// this repo renders them yet — they are typechecked and linted all the same.

// Interactive playground: every knob is wired to a Ladle control so you can
// change variant/size/radius/etc. from the "Controls" form in the sidebar and
// watch the button update live — useful while tuning the defaults.
//
// No `color` knob. `Button` still takes the prop — this is what the playground
// OFFERS, not what the component supports — but the two surfaces that render
// these stories both answer the accent question themselves: the docs site pins
// one accent for the whole page, and the gallery has a picker in its own
// toolbar that repaints the entire frame. A third control for the same thing,
// scoped to one button, disagrees with both.
interface PlaygroundArgs {
  label: string;
  variant: NonNullable<ButtonProps['variant']>;
  size: NonNullable<ButtonProps['size']>;
  radius: NonNullable<ButtonProps['radius']>;
  highContrast: boolean;
  loading: boolean;
  disabled: boolean;
}

export const Playground: Story<PlaygroundArgs> = ({ label, ...rest }) => (
  <div style={{ padding: 24 }}>
    <Button {...rest}>{label}</Button>
  </div>
);

Playground.args = {
  label: 'Click me',
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
};

// `alignItems: 'center'` is load-bearing, not styling. Ghost is not the same
// box as the other five: Radix gives it `height: fit-content` and NEGATIVE
// margins, so its layout box is its TEXT and its ink hangs outside. That is
// exactly right where a ghost belongs — aligned to surrounding prose rather
// than to a row of filled controls — but a definite height opts out of flex
// stretch, so with the default cross-axis rule it pinned to the top of the line
// and sat ~7px high against its neighbours.
//
// Written out one tag per variant, and laid out the way a reader would really
// write it, because THIS SOURCE IS THE DOCUMENTATION: the site discloses it
// verbatim under "Show code". A `.map()` over a variant array is tidier code
// and worse docs — the reader came to see six Buttons, not a loop — and
// wrapping each in a spacer cell would document a workaround as if it were part
// of using the component. What remains is ~1px of the ghost's ink reaching into
// the 8px gap, which is the component telling the truth about itself.
export function Variants() {
  return (
    <div style={{ padding: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="classic">Classic</Button>
      <Button variant="solid">Solid</Button>
      <Button variant="soft">Soft</Button>
      <Button variant="surface">Surface</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Button loading>Loading</Button>
    </div>
  );
}
