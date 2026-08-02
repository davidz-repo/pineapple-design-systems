import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './index';

// Radix defaults Button to `variant="solid"`, `size="2"` and `loading={false}`,
// so the assertions below are written against values that are NOT those
// defaults: `soft`, and loading turned on. A Button that dropped the prop on
// the floor would fail both.
describe('@pineappleui/button', () => {
  it('renders a native button with the provided children', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('Click me');
  });

  it('passes the variant prop through to Radix (sets the rt-variant class)', () => {
    const { getByRole } = render(<Button variant="soft">Soft</Button>);
    const button = getByRole('button');
    expect(button.className).toMatch(/rt-variant-soft/);
  });

  it('renders the Radix loading state (data-disabled set)', () => {
    const { getByRole } = render(<Button loading>Loading</Button>);
    const button = getByRole('button');
    // Radix's loading state sets data-disabled on the button itself. The
    // visible spinner is rendered as an absolutely-positioned span via
    // CSS; we don't assert on the specific element type because Radix may
    // swap it across versions.
    expect(button.hasAttribute('data-disabled')).toBe(true);
  });

  it('forwards refs to the underlying button element', () => {
    let received: HTMLButtonElement | null = null;
    render(
      <Button ref={(el) => { received = el; }}>
        Ref test
      </Button>,
    );
    expect(received).toBeInstanceOf(HTMLButtonElement);
  });
});
