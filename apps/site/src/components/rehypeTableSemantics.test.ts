// @vitest-environment node
//
// The plugin on its own tree. `MarkdownView.test.tsx` renders it through
// react-markdown and asserts what a reader gets; this asserts the shapes that
// arrive from markdown a README could write and this repo's own files do not
// happen to contain — a table with no header row, a row header inside the body,
// the whitespace text nodes hast leaves between rows.

import { describe, expect, it } from 'vitest';

import { rehypeTableSemantics } from './rehypeTableSemantics';

interface TestNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: TestNode[];
  value?: string;
}

/** An element, with the newline text nodes hast really puts between rows. */
function element(tagName: string, children: TestNode[] = []): TestNode {
  return {
    type: 'element',
    tagName,
    properties: {},
    children: children.flatMap(child => [{ type: 'text', value: '\n' }, child]),
  };
}

function text(value: string): TestNode {
  return { type: 'text', value };
}

function run(tree: TestNode): TestNode {
  rehypeTableSemantics()(tree);
  return tree;
}

function elementsOf(node: TestNode): TestNode[] {
  return (node.children ?? []).filter(child => child.type === 'element');
}

describe('rehypeTableSemantics', () => {
  it('states every role a display change would take away, and labels each cell', () => {
    const head = element('thead', [element('tr', [
      element('th', [text('Prop')]),
      element('th', [text('What it does')]),
    ])]);
    const body = element('tbody', [element('tr', [
      element('td', [text('size')]),
      element('td', [text('How big.')]),
    ])]);
    const table = element('table', [head, body]);

    run({ type: 'root', children: [element('div', [table])] });

    expect(table.properties?.role).toBe('table');
    expect(head.properties?.role).toBe('rowgroup');
    expect(body.properties?.role).toBe('rowgroup');

    const [headRow] = elementsOf(head);
    expect(headRow.properties?.role).toBe('row');
    expect(elementsOf(headRow).map(cell => cell.properties?.role))
      .toEqual(['columnheader', 'columnheader']);
    // A header cell is not labelled with itself.
    expect(elementsOf(headRow).map(cell => cell.properties?.['data-label']))
      .toEqual([undefined, undefined]);

    const [bodyRow] = elementsOf(body);
    expect(bodyRow.properties?.role).toBe('row');
    expect(elementsOf(bodyRow).map(cell => cell.properties?.role)).toEqual(['cell', 'cell']);
    // By POSITION, which is the only thing that survives the header row being
    // hidden: the cell has to carry the column it came from.
    expect(elementsOf(bodyRow).map(cell => cell.properties?.['data-label']))
      .toEqual(['Prop', 'What it does']);

    // The headings joined, for the scroll region's accessible name — a README
    // table has no caption to take one from.
    expect(table.properties?.['data-columns']).toBe('Prop, What it does');
  });

  it('labels nothing when there is no header row to label from', () => {
    const cell = element('td', [text('Alone')]);
    const table = element('table', [element('tbody', [element('tr', [cell])])]);

    run({ type: 'root', children: [table] });

    // The roles are the half that still applies; a made-up label would be
    // worse than none, and the region falls back to a generic name.
    expect(cell.properties?.role).toBe('cell');
    expect(cell.properties?.['data-label']).toBeUndefined();
    expect(table.properties?.['data-columns']).toBeUndefined();
  });

  it('treats a header cell in the body as the row header it is', () => {
    const rowHeader = element('th', [text('size')]);
    const value = element('td', [text('How big.')]);
    const table = element('table', [
      element('thead', [element('tr', [element('th', [text('Prop')]), element('th', [text('Note')])])]),
      element('tbody', [element('tr', [rowHeader, value])]),
    ]);

    run({ type: 'root', children: [table] });

    // Stacked, this is the block's title rather than one of its labelled
    // values — so it takes the role and not the label.
    expect(rowHeader.properties?.role).toBe('rowheader');
    expect(rowHeader.properties?.['data-label']).toBeUndefined();
    expect(value.properties?.['data-label']).toBe('Note');
  });
});
