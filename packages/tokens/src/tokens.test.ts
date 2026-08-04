import { describe, expect, it } from 'vitest';

import { ACCENT_COLORS } from './index';

import type { AccentColor } from './index';

describe('@pineappleui/tokens', () => {
  it('exposes the canonical seven accent colors, amber last', () => {
    expect(ACCENT_COLORS).toEqual([
      'indigo',
      'violet',
      'teal',
      'orange',
      'crimson',
      'bronze',
      'amber',
    ]);
    expect(ACCENT_COLORS).toHaveLength(7);
  });

  // The list is picker order, and a new accent is APPENDED so the order every
  // consuming picker already shows does not shuffle. That the newest member is
  // also the current default is a coincidence of two changes landing together,
  // not a rule — @pineappleui/theme's DEFAULT_ACCENT is a literal for exactly
  // that reason, and this assertion is about the append, not about the default.
  it('appends new accents rather than reordering the existing ones', () => {
    expect(ACCENT_COLORS.slice(0, 6))
      .toEqual(['indigo', 'violet', 'teal', 'orange', 'crimson', 'bronze']);
  });

  it('narrows AccentColor at the type level', () => {
    // Compile-time: this line fails tsc if AccentColor isn't `typeof ACCENT_COLORS[number]`.
    const sample: AccentColor = 'amber';
    expect(ACCENT_COLORS).toContain(sample);
  });
});
