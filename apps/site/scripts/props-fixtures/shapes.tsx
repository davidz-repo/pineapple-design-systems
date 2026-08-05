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
// Radix writes all of its), `children` and `ref` for the carve-out, and three
// exports that are NOT components — one lower-case, one capitalised and not
// callable, one capitalised and callable that returns a primitive — because
// the component predicate has to say no to all three.

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

/**
 * A PRESERVED alias, the shape 179 of the artifact's 277 props print through:
 * Radix's `Responsive<T>` is this, one member wider. The union that needs
 * ordering is inside the type argument, where nothing done to the top-level
 * type can reach it — so `reach` below is the only prop in these fixtures that
 * fails if `typeText` sorts the printed type and not the nodes under it.
 */
type Wrapped<T> = T | { at?: T };

export interface WidgetProps {
  /** How many times to draw it. There is no sensible guess, so it is required. */
  count: number;
  /** Which tone to draw it in. */
  tone?: Tone;
  /**
   * How far it spreads. Declared in REVERSE alphabetical order on purpose:
   * `typeText` sorts an expanded literal union, and the union above it is
   * declared alphabetically already, so it would pass whether the sort ran or
   * not. This one passes only if it does.
   */
  spread?: 'wide' | 'narrow' | 'auto';
  /**
   * How far it reaches. Declared REVERSE alphabetical inside a preserved alias,
   * for the same reason `spread` is declared that way outside one — and this is
   * the half a top-level sort never saw.
   */
  reach?: Wrapped<'c' | 'b' | 'a'>;
  /**
   * Which step of the scale. Radix's space scale is this shape — `"0"…"9" |
   * "-1"…"-9"` — and code point alone puts all nine negatives in front, so the
   * scale a reader wants starts at position ten. Two digits and a negative are
   * what tell a number line from a lexicographic sort: `"10"` sorts before `"9"`
   * as text and after it as a number.
   */
  step?: Wrapped<'2' | '-1' | '10' | '0' | '-2'>;
  /** The same claim outside an alias, on the branch that expands a union. */
  level?: '2' | '-1' | '10' | '0';
  /** Whether it says so **loudly** — the `data-loud` attribute, not a style. */
  isLoud?: boolean;
  label?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** A widget. Its own description, so the extractor has one to pick up. */
export function Widget({
  count,
  tone = 'iris',
  isLoud = false,
  label,
  spread,
  children,
}: WidgetProps) {
  return (
    <div data-tone={tone} data-loud={isLoud} data-spread={spread} aria-label={label}>
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

/**
 * Not a component, and the hardest of the three to see: capitalised, callable
 * with one argument, and `string` IS assignable to `ReactNode` — so it passes
 * every test the predicate used to make. Its props would then be the members
 * of a `number`, and this helper would ship a table of `toExponential`,
 * `toFixed`, `toPrecision` and `valueOf`.
 */
export function Rem(px: number): string {
  return `${px / 16}rem`;
}
