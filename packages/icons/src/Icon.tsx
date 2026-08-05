import { ICONS, SIZES } from './vocabulary';

import type { IconName, IconSize } from './vocabulary';

import type { LucideProps } from 'lucide-react';

// An INTERSECTION rather than an `interface … extends`, and that is the whole
// reason this is a type alias: a member re-declared in a derived interface
// REPLACES the inherited one instead of intersecting with it, so a restatement
// there is a new declaration that has to be assignable to upstream's on its own.
// `LucideProps['absoluteStrokeWidth']` is an indexed access on an OPTIONAL
// property, which is `boolean | undefined`, and against Lucide's `absoluteStrokeWidth?:
// boolean` that is `error TS2430: Interface 'IconProps' incorrectly extends …`
// for any consumer on `exactOptionalPropertyTypes` — shipped in this package's
// own `dist/index.d.ts`, and invisible here because packages/tsconfig/base.json
// sets `skipLibCheck: true` and enables no such option.
// `scripts/check-dts-strict.mjs` is what compiles the published `.d.ts` the way
// a consumer will, so the next one of these is a red build rather than a
// release. The intersection has no such edge — optionality is AND-ed across the
// constituents, so Lucide's declaration survives beside the restatement — and it
// is the shape the seven Radix wrappers already use.
export type IconProps = Omit<LucideProps, 'size' | 'aria-hidden' | 'aria-label' | 'role'> & {
  /** Which glyph to render (semantic name). */
  name: IconName;
  /** A size token (`xs`|`sm`|`md`|`lg`|`xl`) or a raw pixel number. Defaults to `md` (16px). */
  size?: IconSize | number;
  /**
   * Set this ONLY when the icon carries meaning on its own — it then renders
   * with `role="img"` + this accessible name. Omit it (the default) for a
   * decorative icon sitting behind an adjacent text label / `aria-label`; the
   * icon is then hidden from the accessibility tree.
   */
  label?: string;
  // Lucide's own prop, re-declared with the same type read straight back off
  // `LucideProps` — nothing here narrows it or gives it a default. It is
  // re-stated only so that it has a description: Lucide ships none, and this is
  // the one row of this package's generated props table that came out blank.
  // The restatement is CHECKED rather than trusted: `LucideProps['absoluteStrokeWidth']`
  // is an indexed access, so renaming or removing the prop upstream is
  // `error TS2339` here at build time rather than a sentence about a prop that
  // no longer exists.
  /**
   * Hold the stroke at its literal width as the glyph scales, instead of letting it thin out at
   * the small sizes and thicken at the large ones.
   */
  absoluteStrokeWidth?: LucideProps['absoluteStrokeWidth'];
};

/**
 * The design-system icon. A thin wrapper over Lucide that fixes the size scale
 * (tokens) and the a11y default (decorative unless `label` is given), so call
 * sites never reach for `lucide-react` directly.
 */
export function Icon({ name, size = 'md', label, ...rest }: IconProps) {
  const Glyph = ICONS[name];
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <Glyph
      {...rest}
      size={px}
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    />
  );
}
