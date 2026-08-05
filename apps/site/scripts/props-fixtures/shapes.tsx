/* eslint-disable react-refresh/only-export-components -- a component beside
   things that are not components is the whole subject of this fixture: the
   extractor has to take the one and leave the others. Nothing here is ever
   mounted, so there is no fast-refresh boundary for the rule to protect. */
import type { ReactNode, Ref } from 'react';

// A fixture for extract-props.test.mjs, not a component anybody renders. It
// exists because the shapes the extractor has to get right are not all present
// in the real packages, and the ones that ARE present come from
// @radix-ui/themes — so asserting cell contents against them would be asserting
// the version of Radix that happened to be installed.
//
// What is deliberately in here: a required prop beside optional ones, a default
// written in the destructuring parameter, a union long enough to matter, JSDoc
// on some props and not others (one of them written in markdown, which is how
// Radix writes all of its), `children` and `ref` for the carve-out, and two
// exports that are NOT components — one lower-case, one capitalised and not
// callable — because the component predicate has to say no to both.

/**
 * Ten members: long enough that the page has to wrap it. Every name is invented
 * — none is a member of `ACCENT_COLORS`, so `scripts/check-token-drift.mjs`
 * reads this as the synthetic union it is rather than a hand-typed copy of the
 * real accent list. That guard has no allowlist on purpose, and a fixture is
 * not the reason to give it one.
 */
type Tone
  = | 'apricot'
    | 'blue'
    | 'cerise'
    | 'grass'
    | 'iris'
    | 'jade'
    | 'lime'
    | 'mint'
    | 'plum'
    | 'ruby';

export interface WidgetProps {
  /** How many times to draw it. There is no sensible guess, so it is required. */
  count: number;
  /** Which tone to draw it in. */
  tone?: Tone;
  /** Whether it says so **loudly** — the `data-loud` attribute, not a style. */
  isLoud?: boolean;
  label?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** A widget. Its own description, so the extractor has one to pick up. */
export function Widget({ count, tone = 'iris', isLoud = false, label, children }: WidgetProps) {
  return (
    <div data-tone={tone} data-loud={isLoud} aria-label={label}>
      {count}
      {children}
    </div>
  );
}

/** Not a component: lower-case, so JSX could never name it. */
export function widgetTone(props: WidgetProps): Tone {
  return props.tone ?? 'iris';
}

/**
 * Not a component either: capitalised, and every member of it is callable —
 * which is exactly how an array of icon names came to be documented as a
 * component with 35 props.
 */
export const WIDGET_TONES: readonly Tone[] = ['apricot', 'blue', 'cerise'];
