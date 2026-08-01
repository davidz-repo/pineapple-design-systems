import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Inline } from './index';

describe('@pineappleui/inline', () => {
  it('renders a div with the provided children', () => {
    const { getByText } = render(<Inline>content</Inline>);
    expect(getByText('content')).toBeTruthy();
  });

  it('defaults to horizontal layout (rt-r-fd-row class)', () => {
    const { container } = render(<Inline>x</Inline>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-fd-row/);
  });

  it('defaults to wrap (rt-r-fw-wrap class)', () => {
    const { container } = render(<Inline>x</Inline>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-fw-wrap/);
  });

  it('passes the gap prop through to Radix (sets the rt-r-gap class)', () => {
    const { container } = render(<Inline gap="3">x</Inline>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-gap-3/);
  });
});
