import type { ComponentPropsWithRef } from 'react';

import { Text as RadixText } from '@radix-ui/themes';

// Inherit the full Radix Text prop surface (size, weight, color, align,
// trim, truncate, wrap, as, asChild, etc.) — this Text is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed.
type RadixTextProps = ComponentPropsWithRef<typeof RadixText>;

// The members below re-declare props only to hang a description on each: the
// same type read straight back off the Radix props, so nothing is narrowed,
// renamed or defaulted here, and a prop Radix adds later still arrives through
// the intersection without being listed. Radix's own defaults survive too —
// they are read from its declaration, which the intersection keeps beside this
// one. They are written because Radix ships no JSDoc on its component prop
// defs and the docs site builds its tables from these types: without them the
// Description column is empty on every row of this package's table.
export type TextProps = RadixTextProps & {
  /** Text alignment inside the element's own box; it does not move the box. */
  align?: RadixTextProps['align'];
  /**
   * The element this renders. The default is inline, which is the safe thing to nest anywhere —
   * a paragraph of body copy wants `p`, and a form caption wants `label`.
   */
  as?: RadixTextProps['as'];
  /** Render the child element instead of the tag, with the type styles on it. */
  asChild?: RadixTextProps['asChild'];
  /** An accent name that overrides the theme's for this text; omit it for the usual foreground. */
  color?: RadixTextProps['color'];
  /** Deepen the text against the surface behind it, for a colour that reads lightly. */
  highContrast?: RadixTextProps['highContrast'];
  /**
   * A step on the type scale, not a CSS length — so body copy across an app moves in the same
   * increments and a one-off `font-size` stands out as the exception it is.
   */
  size?: RadixTextProps['size'];
  /** Trim the leading above or below the text, so it aligns optically with what sits beside it. */
  trim?: RadixTextProps['trim'];
  /** Clip text that will not fit to one line with an ellipsis, rather than wrapping it. */
  truncate?: RadixTextProps['truncate'];
  /** Font weight as a scale token rather than a CSS number, so one emphasis reads the same everywhere. */
  weight?: RadixTextProps['weight'];
  /** Whether the text breaks across lines at all, and how evenly — the CSS `text-wrap` property. */
  wrap?: RadixTextProps['wrap'];
};

export function Text(props: TextProps) {
  return <RadixText {...props} />;
}
