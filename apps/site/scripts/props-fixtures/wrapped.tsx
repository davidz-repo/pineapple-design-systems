/* eslint-disable react/no-forward-ref -- `forwardRef` being unnecessary in
   React 19 is precisely why this fixture exists: no package here is written
   this way, so nothing else in the repo would notice the extractor losing the
   defaults of one that is. Nothing here is ever mounted. */
import { forwardRef, memo } from 'react';

// A fixture for extract-props.test.mjs, not a component anybody renders.
//
// A component whose declaration is a CALL rather than a function: the
// `forwardRef((props, ref) => …)` shape, and `memo(forwardRef(…))` wrapped
// around it. The defaults live in the inner function's destructuring
// parameter, one or two calls deep, and a lookup that stops at a direct
// function finds no parameter list — so every Default cell on such a component
// comes back blank while the props themselves are all still found. Nothing
// about the page would look wrong.
//
// The tone names are invented — neither is a member of `ACCENT_COLORS`, so
// `scripts/check-token-drift.mjs` reads this as the synthetic union it is
// rather than a hand-typed copy of the real accent list.

export interface ChipProps {
  /** Which tone to draw it in. */
  tone?: 'apricot' | 'cerise';
  /** What it says. */
  label?: string;
}

/** A chip, written the way a pre-React-19 codebase forwards a ref. */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ tone = 'apricot', label }, ref) => <span ref={ref} data-tone={tone}>{label}</span>,
);

/** The same, with a second call around it. */
export const Pill = memo(
  forwardRef<HTMLSpanElement, ChipProps>(
    ({ tone = 'cerise', label }, ref) => <span ref={ref} data-tone={tone}>{label}</span>,
  ),
);
