import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextArea } from './index';

// Radix defaults TextArea to `size="2"` and `variant="surface"`, so the two
// pass-through assertions below are written against values that are NOT those
// defaults: size 3 and the soft variant. A TextArea that dropped the prop on
// the floor would fail both.
describe('@pineappleui/text-area', () => {
  it('renders a native textarea', () => {
    const { getByRole } = render(<TextArea placeholder="notes" />);
    const ta = getByRole('textbox');
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta.getAttribute('placeholder')).toBe('notes');
  });

  it('passes the size prop through to Radix (sets the rt-r-size class)', () => {
    const { container } = render(<TextArea size="3" />);
    const wrapper = container.querySelector('.rt-TextAreaRoot');
    expect(wrapper?.className).toMatch(/rt-r-size-3/);
  });

  it('passes the variant prop through to Radix (sets the rt-variant class)', () => {
    const { container } = render(<TextArea variant="soft" />);
    const wrapper = container.querySelector('.rt-TextAreaRoot');
    expect(wrapper?.className).toMatch(/rt-variant-soft/);
  });

  it('forwards refs to the underlying textarea element', () => {
    // Radix puts the ref on the <textarea>, not on the <div> it wraps it in —
    // HTMLElement would hold for either.
    let received: HTMLTextAreaElement | null = null;
    render(
      <TextArea ref={(el) => {
        received = el;
      }}
      />,
    );
    expect(received).toBeInstanceOf(HTMLTextAreaElement);
  });
});
