import {
  ArrowLeftRight,
  Captions,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  House,
  Mic,
  MicOff,
  PhoneOff,
  X,
} from 'lucide-react';

import type { LucideIcon, LucideProps } from 'lucide-react';

// Semantic name → Lucide glyph. Names are intent-based (not tied to the icon
// library), so the underlying set can be swapped without touching call sites.
// Add an entry here the first time a glyph is needed.
const ICONS = {
  'arrow-left-right': ArrowLeftRight,
  'captions': Captions,
  'check': Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'close': X,
  'copy': Copy,
  'home': House,
  'mic': Mic,
  'mic-off': MicOff,
  'phone-off': PhoneOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

// Design-system size tokens (px). `size` also accepts a raw number as an escape
// hatch for the rare off-scale case.
const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} satisfies Record<string, number>;

export type IconSize = keyof typeof SIZES;

export interface IconProps
  extends Omit<LucideProps, 'size' | 'aria-hidden' | 'aria-label' | 'role'> {
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
}

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
