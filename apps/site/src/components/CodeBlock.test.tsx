import { act } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock } from './CodeBlock';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// Nothing here suspends, so these render synchronously — unlike app.test.tsx,
// whose package pages wait on story/README imports and need an async `act`.
// The click still needs one: it is what flushes the clipboard promise.

// jsdom implements no Clipboard API at all, so both halves of the copy path —
// resolved and rejected — only exist in a test that supplies one.
function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

async function clickCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
  });
}

describe('codeBlock', () => {
  it('highlights a registered language into token spans', () => {
    const { container } = render(<CodeBlock code="const answer = 42;" language="ts" />);
    expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
    expect(container.querySelector('.hljs-number')).toHaveTextContent('42');
    // The markup wraps the source; it never rewrites it.
    expect(container.querySelector('pre')).toHaveTextContent('const answer = 42;');
  });

  it('highlights the JSX inside a tsx fence, not just the code around it', () => {
    // JSX reaches highlight.js's `xml` sublanguage. If that grammar were not
    // registered, this element would be emitted as one run of plain text while
    // the `export` beside it still coloured.
    const { container } = render(
      <CodeBlock code={'export const el = <Button variant="solid" />;'} language="tsx" />,
    );
    expect(container.querySelector('.hljs-name')).toHaveTextContent('Button');
    expect(container.querySelector('.hljs-attr')).toHaveTextContent('variant');
  });

  it('renders an unregistered language plainly', () => {
    const { container } = render(<CodeBlock code="answer = 42" language="python" />);
    expect(container.querySelector('code span')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('answer = 42');
  });

  it('renders plainly when no language is given, rather than guessing one', () => {
    const { container } = render(<CodeBlock code="const answer = 42;" />);
    expect(container.querySelector('code span')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('const answer = 42;');
  });

  it('copies the raw source — not the highlighted markup — and announces it', async () => {
    const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { container } = render(<CodeBlock code="const answer = 42;" language="ts" />);

    await clickCopy();

    expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Copied to clipboard');
  });

  it('announces a rejected copy instead of leaving the button silent', async () => {
    stubClipboard(vi.fn<() => Promise<void>>().mockRejectedValue(new Error('denied')));
    const { container } = render(<CodeBlock code="npm install @pineappleui/theme" language="bash" />);

    await clickCopy();

    expect(container.querySelector('[aria-live]')).toHaveTextContent(
      'Couldn\'t copy — select the text and copy manually',
    );
    // Visible as well as announced: the button turns red and swaps its glyph.
    expect(screen.getByRole('button', { name: 'Copy code' }))
      .toHaveAttribute('data-accent-color', 'red');
  });
});
