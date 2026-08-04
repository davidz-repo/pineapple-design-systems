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

function codeTextOf(node: ReactNode): string | undefined {
  if (!isValidElement(node)) {
    return undefined;
  }
  const children = (node.props as { children?: unknown }).children;
  return typeof children === 'string' ? children.replace(/\n$/, '') : undefined;
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
    const code = codeTextOf(children);
    return code === undefined ? <pre>{children}</pre> : <CodeBlock code={code} />;
  },
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
