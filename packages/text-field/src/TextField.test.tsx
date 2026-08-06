import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextField } from './index';

// Radix defaults TextField.Root to `size="2"` and `variant="surface"`, so the
// two pass-through assertions below are written against values that are NOT
// those defaults: size 3 and the soft variant. A field that dropped the prop on
// the floor would fail both.
describe('@pineappleui/text-field', () => {
  it('renders a native input via TextField.Root', () => {
    const { getByRole } = render(<TextField.Root placeholder="email" />);
    const input = getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('placeholder')).toBe('email');
  });

  it('passes the size prop through to Radix (sets the rt-r-size class)', () => {
    const { container } = render(<TextField.Root size="3" />);
    const wrapper = container.querySelector('.rt-TextFieldRoot');
    expect(wrapper?.className).toMatch(/rt-r-size-3/);
  });

  it('passes the variant prop through to Radix (sets the rt-variant class)', () => {
    const { container } = render(<TextField.Root variant="soft" />);
    const wrapper = container.querySelector('.rt-TextFieldRoot');
    expect(wrapper?.className).toMatch(/rt-variant-soft/);
  });

  it('renders TextField.Slot children inside the field', () => {
    // Both halves of that name are asserted: that the child rendered as a slot,
    // and that the slot sits inside the field. `getByText` already throws when
    // the text is absent, so asserting its result is truthy would add nothing
    // and would pass for a bare `@` rendered anywhere in the document.
    const { getByText } = render(
      <TextField.Root>
        <TextField.Slot>@</TextField.Slot>
      </TextField.Root>,
    );
    const slot = getByText('@');
    expect(slot.className).toMatch(/rt-TextFieldSlot/);
    expect(slot.closest('.rt-TextFieldRoot')).not.toBeNull();
  });

  it('passes a slot\'s side through to Radix (sets data-side)', () => {
    // `side` is the one Slot prop with visible consequences beyond looks: Radix
    // reads `data-side` in the CSS that orders the slot AND in Root's
    // pointer-down handler, which puts the caret at the far end of the text for
    // a right-hand slot. Both are attribute selectors, so a wrapper that ate the
    // prop would leave the slot on the wrong side with the caret in the wrong
    // place, and every other assertion in this file would still pass.
    const { getByText } = render(
      <TextField.Root>
        <TextField.Slot side="right">@</TextField.Slot>
      </TextField.Root>,
    );
    expect(getByText('@').getAttribute('data-side')).toBe('right');
  });

  it('forwards refs to the underlying input element', () => {
    // Radix composes TextField.Root's ref onto the inner <input>, not onto the
    // <div> it wraps the field in — HTMLElement would hold for either, and this
    // is the node a consumer focuses or reads `value` from.
    let received: HTMLInputElement | null = null;
    render(
      <TextField.Root ref={(el) => {
        received = el;
      }}
      />,
    );
    expect(received).toBeInstanceOf(HTMLInputElement);
  });
});
