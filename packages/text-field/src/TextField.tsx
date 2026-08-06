import type { ComponentPropsWithRef } from 'react';

import { TextField as RadixTextField } from '@radix-ui/themes';

// Radix Themes' TextField is a compound component (TextField.Root,
// TextField.Slot), wrapped here one member at a time.
//
// ---------------------------------------------------------------------------
// WHY THE PROPS ARE RESTATED
// ---------------------------------------------------------------------------
//
// This package used to be `export { TextField } from '@radix-ui/themes'`, one
// line, and that line is why it carried an exemption in
// `scripts/check-props-coverage.mjs`: a bare re-export has no props type of its
// own to hang JSDoc on, so all thirteen of its rows reached the docs site with a
// blank Description column.
//
// So each member's props are now an INTERSECTION of Radix's own with a local
// type literal that re-declares each prop purely to carry a sentence — the
// pattern `box`, `stack`, `inline`, `badge`, `text`, `heading`, `card` and
// `dropdown-menu` all use. Nothing is added to the runtime surface and nothing
// is taken away; `TextField.RootProps` and `TextField.SlotProps` still resolve
// for consumers, which is what the old one-liner was protecting.
//
// Never `interface XProps extends Omit<RadixXProps, …>`: that ships TS2430 to
// consumers compiling with the default `skipLibCheck: false`, which is what
// `scripts/check-dts-strict.mjs` exists to catch. And the restatement is CHECKED
// rather than trusted — each `RadixRootProps['size']` is an indexed access, so a
// prop Radix renames or drops is a build error here rather than a stale row on
// the site.
//
// The margin props (`m`, `mx`, `mt`, …) are deliberately NOT restated. They are
// marked as layout props by their DECLARATION SITE — `extract-props.mjs` tests
// the path they are declared in — so restating them here would move them out of
// Radix's shared `props/` module, out of the page's disclosure, and into the
// main table, burying the six rows that are actually about a text field.
//
// ---------------------------------------------------------------------------
// WHY EVERY MEMBER IS A PLAIN `function`, AND NEVER `React.FC`
// ---------------------------------------------------------------------------
//
// `@types/react@19`'s `FunctionComponent` returns `ReactNode |
// Promise<ReactNode>`, which is not assignable to `ReactNode` — and the docs
// site's prop extractor counts an export as a component by that assignability.
// A `React.FC` member is therefore dropped from the table silently. Radix
// declares both members here as `ForwardRefExoticComponent`, so this package was
// never bitten, but the shape below is the one that stays safe either way.

type RadixRootProps = ComponentPropsWithRef<typeof RadixTextField.Root>;
type RadixSlotProps = ComponentPropsWithRef<typeof RadixTextField.Slot>;

// eslint-disable-next-line ts/no-namespace
export namespace TextField {
  export type RootProps = RadixRootProps & {
    /**
     * How large the field is drawn, on the theme's scale rather than in pixels —
     * it sets the height, the text size, and the padding and gap of any `Slot`
     * inside it. Match it to the controls beside it; a field at `"3"` next to a
     * button at `"2"` is the most common way a form looks assembled rather than
     * designed. Responsive, so it can step down on narrow viewports.
     *
     * This is NOT the native `<input size>` attribute, which counts characters —
     * Radix replaces that one. For width, use CSS.
     */
    size?: RadixRootProps['size'];
    /**
     * How much of the field is drawn. `"surface"` gives it a filled background
     * and a border, `"classic"` adds the inset shadow that reads as a deeper
     * well, and `"soft"` drops the border for a tinted fill — quieter, and worth
     * reaching for when a form is dense enough that a grid of borders becomes
     * the loudest thing on the screen. Whichever you pick, use one across a form.
     */
    variant?: RadixRootProps['variant'];
    /**
     * The accent the field is drawn in. Takes a scale name from the theme, never
     * a CSS colour. It tints the focus ring and the text selection rather than
     * the text itself, so it is a way to mark a field as belonging to something
     * — not a way to mark it as wrong. Omit it to inherit the theme accent.
     */
    color?: RadixRootProps['color'];
    /**
     * How rounded the corners are, overriding the theme's own radius for this one
     * field. Setting it here is a local exception; when every field wants a
     * different radius, that is the theme's `radius` to change instead.
     */
    radius?: RadixRootProps['radius'];
    /**
     * Which kind of value the field holds. Narrower than HTML's set on purpose:
     * only the types that render as a line of text are here, so `checkbox`,
     * `radio`, `file` and `range` are absent — those are different controls, not
     * variants of this one.
     *
     * It carries real behaviour, not just validation. `email` and `url` change
     * the touch keyboard; `password` suppresses the value from screen readers
     * and password managers key off it; `number` accepts scroll and arrow-key
     * increments, which is why a phone number or a card number wants `tel` and
     * not `number`.
     */
    type?: RadixRootProps['type'];
    /**
     * The field's value, when you own the state — pair it with `onChange`. This
     * package holds no state, so a `value` with no `onChange` is a field the user
     * cannot type in, and React will say so.
     *
     * `string | number` and not the array React allows: that arm is for a
     * `<select multiple>`, and a text field has one value.
     */
    value?: RadixRootProps['value'];
    /**
     * The value the field starts with, for the uncontrolled case. Read once on
     * mount and ignored after, so if the value can arrive late — from a fetch, or
     * from a record the user picked — use `value` instead, or the field will keep
     * showing the empty string it mounted with.
     */
    defaultValue?: RadixRootProps['defaultValue'];
  };

  /**
   * The field: a `<div>` wrapping a native `<input>`. Every prop the input takes
   * passes through, and the ref lands on the `<input>` rather than the wrapper —
   * that is the node you focus, select in, or read `value` from.
   *
   * It renders no label. Pair it with a `<label htmlFor>`: a placeholder is gone
   * on the first keystroke and was never an accessible name.
   */
  export function Root(props: RootProps) {
    return <RadixTextField.Root {...props} />;
  }

  export type SlotProps = RadixSlotProps & {
    /**
     * Which end of the field this slot sits at. Leave it off and the first slot
     * goes left and a second one goes right, which is what a search icon and a
     * clear button want; set it when that is not the arrangement — two slots on
     * the same side, or a single slot on the right.
     *
     * It also decides where the caret lands when someone presses the slot
     * itself: at the start of the text for a left slot, at the end for a right
     * one. So a slot on the wrong side is not only in the wrong place, it puts
     * the caret in the wrong place too.
     */
    side?: RadixSlotProps['side'];
    /**
     * The accent this slot's contents are drawn in, overriding the field's.
     * Takes a scale name from the theme, never a CSS colour. Useful for the one
     * adornment that should read as an action — a visible "clear" — while the
     * rest of the field stays neutral.
     */
    color?: RadixSlotProps['color'];
    /**
     * Space between this slot's children, when it holds more than one. The
     * field's `size` already sets a gap that scales with it, so this is for the
     * case where two adornments need to read as one group, or as two.
     */
    gap?: RadixSlotProps['gap'];
    /**
     * Horizontal padding inside the slot — shorthand for setting `pl` and `pr`
     * together. The field's `size` already sets padding that scales with it;
     * override it when the slot holds a pressable target rather than decoration,
     * because a button padded like an icon has a hit area smaller than the 24px
     * a pointer wants.
     */
    px?: RadixSlotProps['px'];
    /**
     * Padding on the slot's left edge, when only that side needs to move. Set it
     * with `pr` rather than `px` when the slot's content is off-centre — an icon
     * that is visually heavier on one side.
     */
    pl?: RadixSlotProps['pl'];
    /**
     * Padding on the slot's right edge, when only that side needs to move. The
     * pair with `pl`; use `px` when both take the same value.
     */
    pr?: RadixSlotProps['pr'];
  };

  /**
   * An adornment rendered inside the field — an icon, a unit, a prefix, a small
   * button.
   *
   * It is decoration, and the input is the control: pressing a slot focuses the
   * input rather than swallowing the press, so never hang an `onClick` on the
   * slot itself. When the adornment has to be pressable, put a real `<button>`
   * inside it.
   */
  export function Slot(props: SlotProps) {
    return <RadixTextField.Slot {...props} />;
  }
}
