import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon, ICON_NAMES, ICON_SIZES } from './index';

describe('@pineappleui/icons', () => {
  it('renders the named glyph as an svg', () => {
    const { container } = render(<Icon name="close" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains('lucide')).toBe(true);
  });

  it('maps a size token to pixels (sm → 14)', () => {
    const { container } = render(<Icon name="check" size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('14');
    expect(svg?.getAttribute('height')).toBe('14');
  });

  it('accepts a raw pixel number', () => {
    const { container } = render(<Icon name="check" size={15} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('15');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    const { container } = render(<Icon name="copy" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('becomes a meaningful image when given a label', () => {
    const { getByRole } = render(<Icon name="phone-off" label="End call" />);
    const svg = getByRole('img', { name: 'End call' });
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders a glyph for every name in ICON_NAMES', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector('svg'), `<Icon name="${name}" /> rendered no svg`).not.toBeNull();
      unmount();
    }
  });

  it('resolves every token in ICON_SIZES to a pixel width', () => {
    for (const size of ICON_SIZES) {
      const { container, unmount } = render(<Icon name="home" size={size} />);
      const width = container.querySelector('svg')?.getAttribute('width');
      expect(Number(width), `size="${size}" did not resolve to a number`).toBeGreaterThan(0);
      unmount();
    }
  });

  it('exposes both vocabularies non-empty, so a picker has something to enumerate', () => {
    // Empty is the failure mode worth guarding: a derivation that silently
    // yields nothing renders an empty picker rather than throwing.
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(ICON_NAMES).toContain('mic');
    expect(ICON_SIZES.length).toBeGreaterThan(0);
    expect(ICON_SIZES).toContain('md');
  });
});
