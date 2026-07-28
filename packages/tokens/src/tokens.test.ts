import { describe, expect, it } from 'vitest';

import { ACCENT_COLORS } from './index';

import type { AccentColor } from './index';

describe('@pineappleui/tokens', () => {
  it('exposes the canonical six accent colors, bronze last', () => {
    expect(ACCENT_COLORS).toEqual(['indigo', 'violet', 'teal', 'orange', 'crimson', 'bronze']);
    expect(ACCENT_COLORS).toHaveLength(6);
  });

  it('ends with the default accent', () => {
    expect(ACCENT_COLORS[ACCENT_COLORS.length - 1]).toBe('bronze');
  });

  it('narrows AccentColor at the type level', () => {
    // Compile-time: this line fails tsc if AccentColor isn't `typeof ACCENT_COLORS[number]`.
    const sample: AccentColor = 'bronze';
    expect(ACCENT_COLORS).toContain(sample);
  });
});
