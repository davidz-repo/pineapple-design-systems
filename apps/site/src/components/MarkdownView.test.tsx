import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

  it('renders a file\'s headings at its own levels by default', () => {
    const { container } = render(<MarkdownView markdown={'## 0.1.0\n\n### Patch changes'} />);
    expect(container.querySelector('h2')).toHaveTextContent('0.1.0');
    expect(container.querySelector('h3')).toHaveTextContent('Patch changes');
  });

  it('demotes every heading by the offset, and the type scale with it', () => {
    const { container } = render(
      <MarkdownView markdown={'## What it exports\n\n### Props'} headingOffset={1} />,
    );
    // A section of a page, not the top of one: `## What it exports` sits under
    // the site's own `## README`, so it is an h3 and reads like one.
    const [demoted] = container.querySelectorAll('h3');
    expect(demoted).toHaveTextContent('What it exports');
    // Drawn at the level it landed on, not the one it was written at: an
    // outline a reader hears and a type scale they see must agree.
    expect(demoted.className).toMatch(/rt-r-size-4/);
    expect(container.querySelector('h4')).toHaveTextContent('Props');
    expect(container.querySelector('h2')).toBeNull();
  });

  it('stops demoting at h6, the deepest level HTML has', () => {
    const { container } = render(<MarkdownView markdown="###### Deep" headingOffset={2} />);
    expect(container.querySelector('h6')).toHaveTextContent('Deep');
  });

  it('navigates in place when a README links a page of this site', () => {
    // Ten package READMEs now point at their own docs page. Those links have to
    // be absolute — a README is read on npm and on GitHub as well — and read
    // HERE they are the page the reader is already on. Untranslated they went
    // through the `target="_blank"` branch below: a second tab, onto this.
    const { getByRole } = render(
      <MemoryRouter>
        <MarkdownView
          markdown="See [Button on designpineapple.com](https://designpineapple.com/components/button)."
        />
      </MemoryRouter>,
    );

    const link = getByRole('link', { name: 'Button on designpineapple.com' });
    expect(link).toHaveAttribute('href', '/components/button');
    expect(link).not.toHaveAttribute('target');
  });

  it('still opens a genuinely external link in a new tab', () => {
    const { getByRole } = render(
      <MemoryRouter>
        <MarkdownView markdown="See [Radix](https://www.radix-ui.com/themes/docs/components/box)." />
      </MemoryRouter>,
    );

    const link = getByRole('link', { name: 'Radix' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('wraps a table in a horizontal scroll container, named and reachable', () => {
    const { container, getByText, getByRole } = render(
      <MarkdownView markdown={'| Prop | Description |\n| --- | --- |\n| `size` | How big. |'} />,
    );
    const wrapper = container.querySelector('.markdown-table-scroll');
    expect(wrapper?.firstElementChild?.tagName).toBe('TABLE');
    // The wrapper is a wrapper: the table's content still renders through it.
    expect(getByText('How big.')).toBeInTheDocument();

    // A container that scrolls and cannot be focused cannot be read past its
    // first column by a keyboard, and an unnamed one announces as "scrollable
    // region" and nothing else. A README table has no caption, so its own
    // column headings are the only thing that says which table this is.
    const region = getByRole('region', { name: 'Prop, Description' });
    expect(region).toBe(wrapper);
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('gives a table the roles and column labels its stacked layout needs', () => {
    const { getByRole, getAllByRole } = render(
      <MarkdownView
        markdown={'| Export | What it is |\n| --- | --- |\n| `Box` | The element. |'}
      />,
    );

    // Below 600px site.css stacks these rows into blocks, and changing a
    // table's `display` drops its implicit ARIA semantics in every engine.
    // rehypeTableSemantics writes them out so they survive the restyle; above
    // the breakpoint they are the roles these elements already have. jsdom
    // evaluates no media query, so this asserts the markup the layout rests on.
    const table = getByRole('table');
    expect(table).toHaveAttribute('role', 'table');
    expect(getAllByRole('rowgroup')).toHaveLength(2);
    expect(getAllByRole('row')).toHaveLength(2);
    expect(getAllByRole('columnheader').map(cell => cell.textContent))
      .toEqual(['Export', 'What it is']);

    // Each body cell carries its column's heading, because stacked there is no
    // header row above it to read across to.
    expect(getAllByRole('cell').map(cell => cell.getAttribute('data-label')))
      .toEqual(['Export', 'What it is']);
  });
});
