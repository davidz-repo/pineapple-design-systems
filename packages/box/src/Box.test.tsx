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

  it('renders as the provided element via the asChild pattern (with as)', () => {
    const { container } = render(<Box>plain</Box>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
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
