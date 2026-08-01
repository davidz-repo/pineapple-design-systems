import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Box } from './index';

describe('@pineappleui/box', () => {
  it('renders a div with the provided children', () => {
    const { getByText } = render(<Box>content</Box>);
    expect(getByText('content')).toBeTruthy();
  });

  it('passes the p (padding) prop through to Radix (sets the rt-r-p class)', () => {
    const { container } = render(<Box p="4">x</Box>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-p-4/);
  });

  it('renders the element named by the as prop (as="span" renders a span)', () => {
    const { container } = render(<Box as="span">span</Box>);
    expect((container.firstChild as HTMLElement).tagName).toBe('SPAN');
  });

  it('renders the child element in place of the div when asChild is set', () => {
    const { container } = render(
      <Box asChild p="4">
        <section>child</section>
      </Box>,
    );
    const element = container.firstChild as HTMLElement;
    expect(element.tagName).toBe('SECTION');
    expect(element.className).toMatch(/rt-r-p-4/);
  });

  it('forwards refs to the underlying element', () => {
    let received: HTMLDivElement | null = null;
    render(
      <Box ref={(el) => {
        received = el;
      }}
      >
        ref
      </Box>,
    );
    expect(received).toBeInstanceOf(HTMLDivElement);
  });
});
