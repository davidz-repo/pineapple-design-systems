import { ICONS, SIZES } from './vocabulary';

import type { IconName, IconSize } from './vocabulary';

import type { LucideProps } from 'lucide-react';

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
