import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconButton } from './index';

// Radix defaults IconButton to `variant="solid"`, `size="2"` and
// `loading={false}`, so the assertions below are written against values that
// are NOT those defaults: `soft`, and loading turned on. An IconButton that
// dropped the prop on the floor would fail both.
describe('@pineappleui/icon-button', () => {
  it('renders a native button with the provided children', () => {
    const { getByRole } = render(
      <IconButton aria-label="test"><span>icon</span></IconButton>,
    );
    const button = getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('icon');
  });

  it('passes the variant prop through to Radix (sets the rt-variant class)', () => {
    const { getByRole } = render(
      <IconButton aria-label="soft" variant="soft"><span>icon</span></IconButton>,
    );
    const button = getByRole('button');
    expect(button.className).toMatch(/rt-variant-soft/);
  });

  it('renders the Radix loading state (data-disabled set)', () => {
    const { getByRole } = render(
      <IconButton aria-label="loading" loading><span>icon</span></IconButton>,
    );
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
      <IconButton aria-label="ref" ref={(el) => { received = el; }}>
        <span>icon</span>
      </IconButton>,
    );
    expect(received).toBeInstanceOf(HTMLButtonElement);
  });
});
