import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './index';

// Radix defaults Badge to `variant="soft"` and `color=""` (inherit the theme
// accent), so the two pass-through assertions below are written against values
// that are NOT those defaults: `solid` and `crimson`. A Badge that dropped the
// prop on the floor would fail both.
describe('@pineappleui/badge', () => {
  it('renders a span with the provided text content', () => {
    const { getByText } = render(<Badge>new</Badge>);
    const el = getByText('new');
    expect(el.tagName).toBe('SPAN');
  });

  it('passes the variant prop through to Radix (sets the rt-variant class)', () => {
    const { getByText } = render(<Badge variant="solid">solid</Badge>);
    const el = getByText('solid');
    expect(el.className).toMatch(/rt-variant-solid/);
  });

  it('passes the color prop through (sets data-accent-color)', () => {
    const { getByText } = render(<Badge color="crimson">crimson</Badge>);
    const el = getByText('crimson');
    expect(el.getAttribute('data-accent-color')).toBe('crimson');
  });

  it('forwards refs to the underlying span element', () => {
    let received: HTMLSpanElement | null = null;
    render(
      <Badge ref={(el) => {
        received = el;
      }}
      >
        ref
      </Badge>,
    );
    expect(received).toBeInstanceOf(HTMLSpanElement);
  });
});
