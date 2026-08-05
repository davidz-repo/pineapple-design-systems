// A rehype plugin for the tables a README writes, doing the two things the
// stacked mobile layout needs and markdown cannot say for itself.
//
// WHY A TABLE NEEDS HELP TO STACK
//
// Below 768px a reference table cannot be a grid — the columns are narrower
// than their content and the whole page scrolls sideways. The fix is to make
// every row a block and every cell a labelled line (site.css), and it costs two
// things that have to be put back:
//
//   1. THE ROLES. Changing a table's `display` DROPS its implicit ARIA
//      semantics in every engine — `table`, `row`, `cell` and the row/column
//      relationships all go, and what is left is a stack of anonymous divs. The
//      remedy is to state the roles explicitly, which is a no-op above the
//      breakpoint (they are the roles the elements already have) and the whole
//      of the semantics below it.
//   2. THE LABELS. A stacked cell has no column header above it any more, so
//      "surface" on its own line says nothing. Each body cell carries its
//      column's heading as `data-label`, which the CSS draws above the value.
//      The `thead` stays in the accessibility tree — visually hidden, not
//      removed — so the cell-to-column association a screen reader uses is the
//      real one rather than generated content.
//
// The props tables write all of this in their own JSX (PropsSection.tsx). This
// is the same job for the tables it cannot reach: the ones inside a package's
// README, which arrive as markdown and share every `.markdown table` rule.
//
// No imports. The hast types are `@types/hast`'s, which this app does not
// declare — and a plugin that walks a tree of `{ type, tagName, children }` can
// describe the shape it needs in eight lines rather than take a dependency on a
// transitive one.

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

function isNode(value: unknown): value is HastNode {
  return typeof value === 'object' && value !== null && typeof (value as HastNode).type === 'string';
}

/** An element's text, the way a column heading reads. */
function textOf(node: HastNode): string {
  return node.type === 'text'
    ? node.value ?? ''
    : (node.children ?? []).map(textOf).join('');
}

/** Element children only — hast keeps the newlines between rows as text nodes. */
function elementsOf(node: HastNode | undefined, tagName?: string): HastNode[] {
  return (node?.children ?? []).filter(
    child => child.type === 'element' && (tagName === undefined || child.tagName === tagName),
  );
}

function annotate(node: HastNode, properties: Record<string, unknown>): void {
  node.properties = { ...node.properties, ...properties };
}

function annotateTable(table: HastNode): void {
  annotate(table, { role: 'table' });

  const [caption] = elementsOf(table, 'caption');
  if (caption !== undefined) {
    annotate(caption, { role: 'caption' });
  }

  const groups = elementsOf(table).filter(
    child => child.tagName === 'thead' || child.tagName === 'tbody' || child.tagName === 'tfoot',
  );
  const [headRow] = elementsOf(groups.find(group => group.tagName === 'thead'), 'tr');
  const labels = elementsOf(headRow).map(cell => textOf(cell).replace(/\s+/g, ' ').trim());

  for (const group of groups) {
    annotate(group, { role: 'rowgroup' });
    const isHead = group.tagName === 'thead';

    for (const row of elementsOf(group, 'tr')) {
      annotate(row, { role: 'row' });

      elementsOf(row).forEach((cell, column) => {
        if (cell.tagName === 'th') {
          // A row header is the stacked block's title, so it takes no label of
          // its own — the value IS the name of the thing.
          annotate(cell, { role: isHead ? 'columnheader' : 'rowheader' });
          return;
        }
        const label = labels[column];
        annotate(cell, {
          role: 'cell',
          ...(isHead || label === undefined || label === '' ? {} : { 'data-label': label }),
        });
      });
    }
  }

  if (labels.length > 0) {
    // What the table is about, for the scroll region's accessible name. A
    // README table has no caption to borrow one from, and its column headings
    // are the only thing on the page that says which table this is.
    annotate(table, { 'data-columns': labels.join(', ') });
  }
}

function walk(node: HastNode): void {
  if (node.tagName === 'table') {
    annotateTable(node);
    return;
  }
  for (const child of node.children ?? []) {
    walk(child);
  }
}

/**
 * Roles and column labels on every table in the tree, so a README's tables can
 * stack on a phone without losing what a table is.
 */
export function rehypeTableSemantics() {
  return (tree: unknown): void => {
    if (isNode(tree)) {
      walk(tree);
    }
  };
}
