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

  it('forwards refs to the underlying element', () => {
    // The ref rides in `...rest`, past the destructured `direction`, onto the
    // <div> Radix's Flex renders. That is the half of the pass-through nothing
    // else here pins: a refactor that stopped spreading `rest` would still
    // render, still lay out, and silently drop every consumer's ref.
    // HTMLDivElement rather than HTMLElement, per the `text` delta's rule —
    // HTMLElement would hold for whatever the layout turned into next.
    let received: HTMLDivElement | null = null;
    render(
      <Stack ref={(el) => {
        received = el;
      }}
      >
        ref
      </Stack>,
    );
    expect(received).toBeInstanceOf(HTMLDivElement);
  });
});
