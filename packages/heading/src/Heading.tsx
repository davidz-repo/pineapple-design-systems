import type { ComponentPropsWithRef } from 'react';

import { Heading as RadixHeading } from '@radix-ui/themes';

// Inherit the full Radix Heading prop surface (as, size, weight, align, color,
// trim, truncate, wrap, highContrast, etc.) — this Heading is an indirection
// point, not a custom API today.
//
// React 19: ref is a regular prop, no forwardRef needed. Passing through
// to Radix's forwardRef-based Heading works transparently.
type RadixHeadingProps = ComponentPropsWithRef<typeof RadixHeading>;

// The members below re-declare props only to hang a description on each: the
// same type read straight back off the Radix props, so nothing is narrowed,
// renamed or defaulted here, and a prop Radix adds later still arrives through
// the intersection without being listed. Radix's own defaults survive too —
// they are read from its declaration, which the intersection keeps beside this
// one. They are written because Radix ships no JSDoc on its component prop
// defs and the docs site builds its tables from these types: without them the
// Description column is empty on every row of this package's table.
//
// The restatement is CHECKED rather than trusted, which is the answer to
// "isn't this a second source of truth?": `RadixHeadingProps['trim']` is an
// INDEXED ACCESS, so a prop Radix renames or removes is `error TS2339:
// Property … does not exist` here, at build time. The one thing no check
// catches is Radix RETYPING a prop — the overlay follows it silently and stays
// correct, and only the sentence beside it can go stale.
//
// `as` and `size` are also the two this package actually does something with,
// and their descriptions are where that is stated to a reader who is looking at
// the props rather than at the README.
export type HeadingProps = RadixHeadingProps & {
  /** Text alignment inside the heading's own box; it does not move the box. */
  align?: RadixHeadingProps['align'];
  /**
   * The outline level a screen reader walks — and, unless `size` says otherwise, the type-scale
   * step this package renders it at. Radix's `as` sets the tag alone, which is why an unstyled
   * h1 through h6 all come out the same size.
   */
  as?: RadixHeadingProps['as'];
  /** Render the child element instead of the heading tag, with the heading's type styles on it. */
  asChild?: RadixHeadingProps['asChild'];
  /** An accent name that overrides the theme's for this heading; omit it for the usual foreground. */
  color?: RadixHeadingProps['color'];
  /** Deepen the heading against the page behind it, for a colour that reads lightly. */
  highContrast?: RadixHeadingProps['highContrast'];
  /**
   * A step on the type scale. Pass one when a level has to look bigger or smaller than its rank —
   * it overrides the size derived from `as` and leaves the semantic level alone.
   */
  size?: RadixHeadingProps['size'];
  /** Trim the leading above or below the text, so a heading aligns optically with what sits beside it. */
  trim?: RadixHeadingProps['trim'];
  /** Clip a heading that will not fit to one line with an ellipsis, rather than wrapping it. */
  truncate?: RadixHeadingProps['truncate'];
  /** Font weight as a scale token rather than a CSS number, so one emphasis reads the same everywhere. */
  weight?: RadixHeadingProps['weight'];
  /** Whether the heading breaks across lines at all, and how evenly — the CSS `text-wrap` property. */
  wrap?: RadixHeadingProps['wrap'];
};

// Map each heading level to a default type-scale size, so `<Heading as="hN">`
// renders at a visibly distinct size out of the box. Radix's `as` only sets the
// semantic tag (not the visual size), which is why unstyled h1–h6 all look the
// same. An explicit `size` always wins; a bare <Heading> (no `as`) keeps Radix's
// own default size.
const LEVEL_SIZE = {
  h1: '8',
  h2: '7',
  h3: '6',
  h4: '5',
  h5: '4',
  h6: '3',
} satisfies Record<string, HeadingProps['size']>;

export function Heading({ as, size, ...props }: HeadingProps) {
  const resolvedSize = size ?? (as ? LEVEL_SIZE[as] : undefined);
  return <RadixHeading as={as} size={resolvedSize} {...props} />;
}
