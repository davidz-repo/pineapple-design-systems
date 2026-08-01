import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from './index';

describe('@pineappleui/text', () => {
  it('renders the provided text content', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });

  it('passes the size prop through to Radix (sets the rt-r-size class)', () => {
    const { getByText } = render(<Text size="5">sized</Text>);
    const el = getByText('sized');
    expect(el.className).toMatch(/rt-r-size-5/);
  });

  it('passes the weight prop through to Radix (sets the rt-r-weight class)', () => {
    const { getByText } = render(<Text weight="bold">bold</Text>);
    const el = getByText('bold');
    expect(el.className).toMatch(/rt-r-weight-bold/);
  });

  it('forwards refs to the underlying element', () => {
    let received: HTMLElement | null = null;
    render(
      <Text ref={(el) => { received = el; }}>
        Ref test
      </Text>,
    );
    expect(received).toBeInstanceOf(HTMLElement);
  });
});
