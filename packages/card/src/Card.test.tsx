import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './index';

// Radix defaults Card to `size="1"` and `variant="surface"`, so the two
// pass-through assertions below are written against values that are NOT those
// defaults: size 3 and the classic variant. A Card that dropped the prop on the
// floor would fail both.
describe('@pineappleui/card', () => {
  it('renders a div with the provided children', () => {
    const { getByText } = render(<Card>content</Card>);
    const el = getByText('content');
    expect(el.tagName).toBe('DIV');
  });

  it('passes the size prop through to Radix (sets the rt-r-size class)', () => {
    const { container } = render(<Card size="3">x</Card>);
    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-size-3/);
  });

  it('passes the variant prop through (sets the rt-variant class)', () => {
    const { container } = render(<Card variant="classic">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-variant-classic/);
  });

  it('forwards refs to the underlying element', () => {
    let received: HTMLDivElement | null = null;
    render(
      <Card ref={(el) => {
        received = el;
      }}
      >
        ref
      </Card>,
    );
    expect(received).toBeInstanceOf(HTMLDivElement);
  });
});
