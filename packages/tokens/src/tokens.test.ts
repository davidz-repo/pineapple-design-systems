import { describe, expect, it } from 'vitest';

import { ACCENT_COLORS } from './index';

import type { AccentColor } from './index';

describe('@pineappleui/tokens', () => {
  it('exposes the canonical six accent colors, bronze first', () => {
    expect(ACCENT_COLORS).toEqual(['bronze', 'indigo', 'violet', 'teal', 'orange', 'crimson']);
    expect(ACCENT_COLORS).toHaveLength(6);
  });

  it('leads with the default accent', () => {
    expect(ACCENT_COLORS[0]).toBe('bronze');
  });

  it('narrows AccentColor at the type level', () => {
    // Compile-time: this line fails tsc if AccentColor isn't `typeof ACCENT_COLORS[number]`.
    const sample: AccentColor = 'bronze';
    expect(ACCENT_COLORS).toContain(sample);
  });
});
