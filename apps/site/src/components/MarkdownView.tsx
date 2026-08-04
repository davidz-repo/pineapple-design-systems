import type { ReactNode } from 'react';
import { isValidElement } from 'react';

import { Heading } from '@pineappleui/heading';

import { Text } from '@pineappleui/text';
import Markdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

import { CodeBlock } from './CodeBlock';

import type { Components } from 'react-markdown';

// Renders a package's own README/CHANGELOG through design-system components,
// so the docs read in the system's own typography. Structural elements the
// system has no component for (tables, lists, blockquotes) keep their HTML
// tags and are styled by the `.markdown` rules in site.css.

interface MarkdownViewProps {
  markdown: string;
  /** Drop a leading `# Title` line — the page header already shows the name. */
  stripLeadingH1?: boolean;
}

interface Fence {
  code: string;
  /** The fence's `language-*` info string, if the author wrote one. */
  language?: string;
}

// A ``` fence reaches the `pre` override as a single `code` element whose
// className carries the info string remark wrote (```tsx -> `language-tsx`).
// Both halves are read here: the text is what CodeBlock copies, the language is
// what it highlights by. Anything else under `pre` (there is no such markdown
// today, but `pre` is reachable from raw HTML) is left as plain markup.
function fenceOf(node: ReactNode): Fence | undefined {
  if (!isValidElement(node)) {
    return undefined;
  }
  const { children, className } = node.props as { children?: unknown; className?: unknown };
  if (typeof children !== 'string') {
    return undefined;
  }
  const language = typeof className === 'string'
    ? /(?:^|\s)language-(\S+)/.exec(className)?.[1]
    : undefined;
  return { code: children.replace(/\n$/, ''), language };
}

const components: Components = {
  h1: ({ children }) => <Heading as="h1" size="7" mt="6" mb="3">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2" size="5" mt="6" mb="3">{children}</Heading>,
  h3: ({ children }) => <Heading as="h3" size="4" mt="5" mb="2">{children}</Heading>,
  h4: ({ children }) => <Heading as="h4" size="3" mt="4" mb="2">{children}</Heading>,
  p: ({ children }) => <Text as="p" size="3" mb="3">{children}</Text>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">{children}</a>
  ),
  pre: ({ children }) => {
    const fence = fenceOf(children);
    return fence === undefined
      ? <pre>{children}</pre>
      : <CodeBlock code={fence.code} language={fence.language} />;
  },
  // READMEs carry prop tables far wider than a phone: the theme package's
  // options table alone has 60-word cells. Scrolling the table instead of the
  // page keeps the surrounding prose at the reader's line length, and the
  // first-column min-width (site.css) stops the name column collapsing to one
  // character per line to buy the description room it does not have either.
  table: ({ children }) => (
    <div className="markdown-table-scroll">
      <table>{children}</table>
    </div>
  ),
};

export function MarkdownView({ markdown, stripLeadingH1 = false }: MarkdownViewProps) {
  const body = stripLeadingH1 ? markdown.replace(/^#\s.*\n+/, '') : markdown;
  return (
    <div className="markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </Markdown>
    </div>
  );
}
