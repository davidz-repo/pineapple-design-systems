import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownView } from './MarkdownView';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// react-markdown renders synchronously, so these need no async `act` (see
// app.test.tsx, where the package pages suspend and do).

describe('markdownView', () => {
  it('passes a fence language through to CodeBlock, which highlights it', () => {
    const { container } = render(
      <MarkdownView markdown={'```tsx\nexport const answer = 42;\n```'} />,
    );
    // The `language-tsx` className remark writes onto the `code` element is the
    // only place the fence's language survives; dropping it renders the same
    // text with no token markup at all.
    expect(container.querySelector('.hljs-keyword')).toHaveTextContent('export');
    expect(container.querySelector('pre')).toHaveTextContent('export const answer = 42;');
  });

  it('renders a fence in an unregistered language plainly', () => {
    const { container } = render(<MarkdownView markdown={'```python\nanswer = 42\n```'} />);
    expect(container.querySelector('code span')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('answer = 42');
  });

  it('wraps a table in a horizontal scroll container', () => {
    const { container, getByText } = render(
      <MarkdownView markdown={'| Prop | Description |\n| --- | --- |\n| `size` | How big. |'} />,
    );
    const wrapper = container.querySelector('.markdown-table-scroll');
    expect(wrapper?.firstElementChild?.tagName).toBe('TABLE');
    // The wrapper is a wrapper: the table's content still renders through it.
    expect(getByText('How big.')).toBeInTheDocument();
  });
});
