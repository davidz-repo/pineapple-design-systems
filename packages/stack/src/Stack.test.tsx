import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Stack } from './index';

describe('@pineappleui/stack', () => {
  it('renders a div with the provided children', () => {
    const { getByText } = render(<Stack>content</Stack>);
    expect(getByText('content')).toBeTruthy();
  });

  it('defaults to vertical layout (rt-r-fd-column class)', () => {
    const { container } = render(<Stack>x</Stack>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-fd-column/);
  });

  it('honors a direction="column-reverse" override', () => {
    const { container } = render(<Stack direction="column-reverse">x</Stack>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-fd-column-reverse/);
  });

  it('passes the gap prop through to Radix (sets the rt-r-gap class)', () => {
    const { container } = render(<Stack gap="3">x</Stack>);
    expect((container.firstChild as HTMLElement).className).toMatch(/rt-r-gap-3/);
  });
});
