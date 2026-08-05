import type { ReactNode } from 'react';
import { isValidElement } from 'react';

import { Heading } from '@pineappleui/heading';

import { Text } from '@pineappleui/text';
import Markdown from 'react-markdown';

import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';

import { internalRouteFor } from '../packageLinks';
import { CodeBlock } from './CodeBlock';
import { rehypeTableSemantics } from './rehypeTableSemantics';

import type { Components } from 'react-markdown';

// Renders a package's own README/CHANGELOG through design-system components,
// so the docs read in the system's own typography. Structural elements the
// system has no component for (tables, lists, blockquotes) keep their HTML
// tags and are styled by the `.markdown` rules in site.css.

interface MarkdownViewProps {
  markdown: string;
  /** Drop a leading `# Title` line — the page header already shows the name. */
  stripLeadingH1?: boolean;
  /**
   * Demote every heading by this many levels. A file rendered as a SECTION of a
   * page is not the top of one: the README sits under the page's own `##
   * README`, so its `##` sections are that heading's children and have to say
   * so. Left at 0, the file's levels are the page's — which is right for the
   * Changelog tab, where the file IS the page.
   */
  headingOffset?: number;
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

// What a heading looks like at each level. Demotion reads this by the level it
// lands ON, so a heading that says "h3" in the outline is drawn as one: an
// outline a reader can hear and a type scale they can see must not disagree.
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const HEADING_STYLE = {
  h1: { size: '7', mt: '6', mb: '3' },
  h2: { size: '5', mt: '6', mb: '3' },
  h3: { size: '4', mt: '5', mb: '2' },
  h4: { size: '3', mt: '4', mb: '2' },
  h5: { size: '2', mt: '4', mb: '2' },
  h6: { size: '2', mt: '4', mb: '2' },
} as const;

function MarkdownHeading({
  level,
  offset,
  children,
}: {
  level: number;
  offset: number;
  children: ReactNode;
}) {
  // h6 is the floor HTML gives: a document deep enough to hit it has a
  // structural problem no rendering can fix, and inventing an `h7` would only
  // hide it.
  const tag = HEADING_TAGS[Math.min(level + offset, HEADING_TAGS.length) - 1] ?? 'h6';
  const { size, mt, mb } = HEADING_STYLE[tag];
  return <Heading as={tag} size={size} mt={mt} mb={mb}>{children}</Heading>;
}

const components: Components = {
  p: ({ children }) => <Text as="p" size="3" mb="3">{children}</Text>,
  // A README is written to be read on npm and on GitHub, so a link to a sibling
  // package has to be that package's URL on GitHub. Read here, that link leaves
  // the site to show a source tree for a package whose docs page is one route
  // away — so those, and only those, become internal navigations. Everything
  // else (Radix, Lucide, the repo itself) is genuinely elsewhere and opens in a
  // new tab, which is what keeps the reader's place in the page they are on.
  a: ({ href, children }) => {
    const route = href === undefined ? undefined : internalRouteFor(href);
    return route === undefined
      ? <a href={href} target="_blank" rel="noreferrer">{children}</a>
      : <Link to={route}>{children}</Link>;
  },
  pre: ({ children }) => {
    const fence = fenceOf(children);
    return fence === undefined
      ? <pre>{children}</pre>
      : <CodeBlock code={fence.code} language={fence.language} />;
  },
  // READMEs carry prop tables far wider than a phone: the theme package's
  // options table alone has 60-word cells. Above 600px the table scrolls rather
  // than the page, so the surrounding prose keeps the reader's line length, and
  // the first-column min-width (site.css) stops the name column collapsing to
  // one character per line to buy the description room it does not have either.
  // Below 600px it stacks instead and nothing scrolls — see
  // `rehypeTableSemantics`, which is what keeps it a table while it does.
  //
  // Named and focusable for the same reason the props tables' wrapper is: a
  // container that scrolls and cannot be focused cannot be read past its first
  // column by a keyboard, and an unnamed one announces as "scrollable region"
  // and nothing else. A README table has no caption, so its own column headings
  // are the name — the only thing on the page that says which table this is.
  table: ({ children, node }) => {
    const columns = node?.properties?.['data-columns'];
    return (
      <div
        className="markdown-table-scroll"
        role="region"
        aria-label={typeof columns === 'string' && columns !== '' ? columns : 'Table'}
        tabIndex={0}
      >
        {/* The plugin puts `role="table"` on the hast node; this override
            builds the element itself and does not spread its properties, so
            the role is written here. Everything below the table — rowgroups,
            rows, cells — comes through as the plugin left it. */}
        <table role="table">{children}</table>
      </div>
    );
  },
};

// One components map per offset, built once and kept. react-markdown re-renders
// every node when this object's identity changes, and a map rebuilt in the
// component body would hand it a new one on every render — for a value that
// depends on nothing but a number.
const componentsByOffset = new Map<number, Components>();

function componentsFor(headingOffset: number): Components {
  let byOffset = componentsByOffset.get(headingOffset);
  if (byOffset === undefined) {
    byOffset = {
      ...components,
      h1: ({ children }) => <MarkdownHeading level={1} offset={headingOffset}>{children}</MarkdownHeading>,
      h2: ({ children }) => <MarkdownHeading level={2} offset={headingOffset}>{children}</MarkdownHeading>,
      h3: ({ children }) => <MarkdownHeading level={3} offset={headingOffset}>{children}</MarkdownHeading>,
      h4: ({ children }) => <MarkdownHeading level={4} offset={headingOffset}>{children}</MarkdownHeading>,
      h5: ({ children }) => <MarkdownHeading level={5} offset={headingOffset}>{children}</MarkdownHeading>,
      h6: ({ children }) => <MarkdownHeading level={6} offset={headingOffset}>{children}</MarkdownHeading>,
    };
    componentsByOffset.set(headingOffset, byOffset);
  }
  return byOffset;
}

export function MarkdownView({
  markdown,
  stripLeadingH1 = false,
  headingOffset = 0,
}: MarkdownViewProps) {
  const body = stripLeadingH1 ? markdown.replace(/^#\s.*\n+/, '') : markdown;
  return (
    <div className="markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeTableSemantics]}
        components={componentsFor(headingOffset)}
      >
        {body}
      </Markdown>
    </div>
  );
}
