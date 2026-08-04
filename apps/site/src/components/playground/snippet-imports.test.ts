import { expect, it } from 'vitest';

import { bySlug, REGISTRY } from '../../registry';
import { deriveImportLines, prependImports } from './snippet-imports';

// The snippet is copyable, so "does it compile where it lands" is the whole
// contract. These run the REAL registry snippets rather than hand-written JSX:
// a snippet edit that outgrows its imports fails here.

function snippetFor(slug: string, args: Record<string, unknown>): string {
  const snippet = bySlug.get(slug)?.snippet;
  if (snippet === undefined) {
    throw new Error(`registry entry \`${slug}\` has no snippet fn`);
  }
  return snippet(args);
}

it('prepends the import, a blank line, then the JSX', () => {
  expect(prependImports(snippetFor('button', { label: 'Click me', variant: 'soft' })))
    .toBe([
      'import { Button } from \'@pineappleui/button\';',
      '',
      '<Button variant="soft">Click me</Button>',
    ].join('\n'));
});

it('imports the namespace, not the member, for a compound component', () => {
  // `<TextField.Root>` — you import TextField, never TextField.Root.
  expect(deriveImportLines(snippetFor('text-field', { placeholder: 'you@example.com' })))
    .toEqual(['import { TextField } from \'@pineappleui/text-field\';']);
});

it('imports every package a snippet reaches into', () => {
  // icon-button's snippet embeds an <Icon> child: two packages, two lines.
  expect(deriveImportLines(snippetFor('icon-button', { variant: 'soft' })))
    .toEqual([
      'import { IconButton } from \'@pineappleui/icon-button\';',
      'import { Icon } from \'@pineappleui/icons\';',
    ]);
});

it('ignores host elements a snippet wraps in', () => {
  // The icons snippet puts a plain <span> around the glyph to carry `color`;
  // a host tag is not an import.
  expect(deriveImportLines(snippetFor('icons', { name: 'home', color: 'var(--red-11)' })))
    .toEqual(['import { Icon } from \'@pineappleui/icons\';']);
});

it('leaves a snippet with nothing importable untouched', () => {
  expect(prependImports('<span>plain markup</span>')).toBe('<span>plain markup</span>');
});

// Guard-shaped: an entry whose `name` stops matching the component its snippet
// renders would silently ship a snippet with no import at all.
it('every registry snippet resolves at least one import', () => {
  for (const entry of REGISTRY) {
    if (entry.snippet === undefined) {
      continue;
    }
    expect(
      deriveImportLines(entry.snippet({})),
      `registry entry \`${entry.slug}\`: snippet resolves no import line`,
    ).not.toHaveLength(0);
  }
});
