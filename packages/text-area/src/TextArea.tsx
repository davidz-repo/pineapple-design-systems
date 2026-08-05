import type { ComponentPropsWithRef } from 'react';

import { TextArea as RadixTextArea } from '@radix-ui/themes';

// Inherit the full Radix TextArea prop surface (size, variant, color, radius,
// resize, etc.). React 19 ref-as-prop pattern.
type RadixTextAreaProps = ComponentPropsWithRef<typeof RadixTextArea>;

// The members below re-declare props only to hang a description on each: the
// same type read straight back off the Radix props, so nothing is narrowed,
// renamed or defaulted here, and a prop Radix adds later still arrives through
// the intersection without being listed. Radix's own defaults survive too —
// they are read from its declaration, which the intersection keeps beside this
// one. They are written because Radix ships no JSDoc on its component prop
// defs and the docs site builds its tables from these types: without them the
// Description column is empty on every row of this package's table.
//
// `value` and `defaultValue` are in that list because Radix narrows them from
// what React declares for a `<textarea>` — which is why they show up in a table
// that otherwise leaves the DOM attributes to MDN, and why they are worth a
// sentence about which one you are choosing.
export type TextAreaProps = RadixTextAreaProps & {
  /** An accent name that overrides the theme's for this field's focus ring and selection. */
  color?: RadixTextAreaProps['color'];
  /**
   * The starting text of an uncontrolled field. This package holds no state, so from the first
   * render the DOM owns the value — read it off the element, not from here.
   */
  defaultValue?: RadixTextAreaProps['defaultValue'];
  /** Override the theme's corner rounding for this field alone. */
  radius?: RadixTextAreaProps['radius'];
  /**
   * Which way the user's own drag handle can resize the field — the CSS `resize` property, and
   * not autosizing. A field that grows with its content is a behaviour, and behaviours belong
   * in the consumer.
   */
  resize?: RadixTextAreaProps['resize'];
  /** Text size and padding in one step, so fields down a form share a rhythm. */
  size?: RadixTextAreaProps['size'];
  /** How the field's border and fill read against the form behind it. */
  variant?: RadixTextAreaProps['variant'];
  /**
   * The text of a controlled field. Pass `onChange` alongside it, or the field renders this and
   * then refuses every keystroke.
   */
  value?: RadixTextAreaProps['value'];
};

export function TextArea(props: TextAreaProps) {
  return <RadixTextArea {...props} />;
}
