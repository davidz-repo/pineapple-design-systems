import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './index';

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
});
