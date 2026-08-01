import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Heading } from './index';

// Radix's own default size for Heading is 6, so every size assertion below is
// written against a size that is NOT 6. `rt-r-size-6` is the class an unstyled
// <Heading> carries anyway: a test that asserts it passes whether or not the
// prop — or the level mapping — reached Radix at all.
describe('@pineappleui/heading', () => {
  it('renders text content as a heading element', () => {
    // Radix defaults to <h1>; assert the role + level match.
    const { getByRole } = render(<Heading>Section title</Heading>);
    const heading = getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Section title');
  });

  it('passes the `as` prop through to Radix (renders the requested heading level)', () => {
    const { getByRole } = render(<Heading as="h2">Subsection</Heading>);
    const heading = getByRole('heading', { level: 2 });
    expect(heading.tagName).toBe('H2');
    expect(heading.textContent).toBe('Subsection');
  });

  it('passes the `size` prop through to Radix (sets the rt-r-size class)', () => {
    const { getByRole } = render(<Heading size="9">Sized</Heading>);
    const heading = getByRole('heading');
    expect(heading.className).toMatch(/rt-r-size-9/);
  });

  it('maps a heading level to its default size (h1 → rt-r-size-8)', () => {
    const { getByRole } = render(<Heading as="h1">Level default</Heading>);
    const heading = getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/rt-r-size-8/);
  });

  it('maps the smallest level to the smallest default size (h6 → rt-r-size-3)', () => {
    const { getByRole } = render(<Heading as="h6">Level default</Heading>);
    const heading = getByRole('heading', { level: 6 });
    expect(heading.className).toMatch(/rt-r-size-3/);
  });

  it('lets an explicit `size` override the level default (h1 size="2" → rt-r-size-2, not -8)', () => {
    const { getByRole } = render(
      <Heading as="h1" size="2">
        Explicit wins
      </Heading>,
    );
    const heading = getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/rt-r-size-2/);
    expect(heading.className).not.toMatch(/rt-r-size-8/);
  });

  it('leaves a bare <Heading> (no `as`, no `size`) on Radix’s own default (no h1 size-8 mapping)', () => {
    const { getByRole } = render(<Heading>Bare</Heading>);
    const heading = getByRole('heading');
    expect(heading.className).not.toMatch(/rt-r-size-8/);
  });

  it('forwards refs to the underlying heading element', () => {
    let received: HTMLHeadingElement | null = null;
    render(
      <Heading ref={(el) => { received = el; }}>
        Ref test
      </Heading>,
    );
    expect(received).toBeInstanceOf(HTMLHeadingElement);
  });
});
