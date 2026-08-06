import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import { SITE_NAME } from './components/pageIdentity';
import { repoRoot } from './test-helpers';

// THE SURFACES NOTHING READS. apps/site/index.html, public/favicon.svg and
// public/og-card.svg are static files: no module imports them, no test rendered
// them, and no scripts/check-*.mjs opens them. So a rename that updates every
// surface a test DOES read — the header wordmark, the home h1, the document
// titles — and forgets one of these ships a stale <title> or a link preview
// still carrying the old name, with CI fully green. That is the same invisible
// coupling app.test.tsx's wordmark guards exist for, and it has already bitten:
// the rename in PR #55 corrected one rationale in pageIdentity.ts and in
// og-card.svg and missed the third copy of it in index.html.
//
// The expected name is IMPORTED from pageIdentity.ts, never spelled here: a
// literal in the test is one more copy of the string to forget.
//
// CONTAINMENT, not equality, and deliberately so — og:title is the name plus a
// suffix, og:image:alt is the name plus a sentence, and the card's own <title>
// is a whole line of prose. What has to hold is that the name REACHES each
// surface, not that it is the whole of it.

const RENAME_MESSAGE = [
  'A surface that nothing else in this repo reads has fallen out of step with',
  `SITE_NAME ("${SITE_NAME}" in src/components/pageIdentity.ts).`,
  '',
  'Renaming the site means editing apps/site/index.html (its <title> and the',
  'og/twitter meta), public/favicon.svg and public/og-card.svg by hand — they',
  'are static files with no build step and no other reader, so nothing but this',
  'test will tell you one of them was missed. og-card.svg also needs its PNG',
  're-rendered to a NEW versioned filename; the recipe is in its header.',
].join('\n');

function readSiteFile(relPath: string): string {
  return readFileSync(path.join(repoRoot, 'apps/site', relPath), 'utf8');
}

const indexHtml = readSiteFile('index.html');
const faviconSvg = readSiteFile('public/favicon.svg');
const ogCardSvg = readSiteFile('public/og-card.svg');

// The extractors throw rather than return empty: a surface this test can no
// longer find is a surface it has stopped checking, which is the failure mode
// it was written against.

/** The text of a document's first `<title>`. */
function titleOf(source: string, file: string): string {
  const [, title] = source.match(/<title>([^<]*)<\/title>/) ?? [];
  if (title === undefined) {
    throw new Error(`${file}: no <title> element to read`);
  }
  return title.trim();
}

/** The `content` of index.html's `<meta>` for one `property`/`name` key. */
function metaContent(key: string): string {
  // `[^>]` spans newlines, which the longer tags in that file are wrapped over.
  const pattern = new RegExp(`<meta[^>]*?(?:property|name)="${key}"[^>]*?content="([^"]*)"`);
  const [, content] = indexHtml.match(pattern) ?? [];
  if (content === undefined) {
    throw new Error(`index.html: no <meta> carrying ${key}`);
  }
  return content;
}

/** An SVG root attribute, e.g. the `aria-label` a scraper reads as alt text. */
function attributeOf(source: string, name: string, file: string): string {
  const [, value] = source.match(new RegExp(`${name}="([^"]*)"`)) ?? [];
  if (value === undefined) {
    throw new Error(`${file}: no ${name} attribute`);
  }
  return value;
}

it('names the site on every surface no component renders and no script checks', () => {
  const surfaces: Array<[string, string]> = [
    ['index.html <title>', titleOf(indexHtml, 'index.html')],
    ['index.html og:site_name', metaContent('og:site_name')],
    ['index.html og:title', metaContent('og:title')],
    ['index.html twitter:title', metaContent('twitter:title')],
    ['index.html og:image:alt', metaContent('og:image:alt')],
    ['favicon.svg <title>', titleOf(faviconSvg, 'public/favicon.svg')],
    ['favicon.svg aria-label', attributeOf(faviconSvg, 'aria-label', 'public/favicon.svg')],
    ['og-card.svg <title>', titleOf(ogCardSvg, 'public/og-card.svg')],
    ['og-card.svg aria-label', attributeOf(ogCardSvg, 'aria-label', 'public/og-card.svg')],
  ];

  for (const [where, text] of surfaces) {
    expect(text, `${where} reads “${text}”.\n\n${RENAME_MESSAGE}`).toContain(SITE_NAME);
  }
});

// The card's URL is absolute (scrapers resolve og:image without a document
// base) and versioned (they cache the BYTES against the URL, so a corrected
// card only reaches them under a name they have not fetched). Both of those
// make it a path with no reader on this side: nothing resolves it at build
// time, so bumping the version in one place and not the other serves the
// scraper a 404 — or on GitHub Pages, 404.html as an image — and the site still
// builds, still tests green, and unfurls as a blank card.
it('points og:image and twitter:image at a card that is actually in public/', () => {
  const ogImage = metaContent('og:image');
  expect(metaContent('twitter:image')).toBe(ogImage);

  const { pathname } = new URL(ogImage);
  const file = path.join(repoRoot, 'apps/site/public', pathname);
  expect(
    existsSync(file),
    `index.html points og:image at ${ogImage}, and apps/site/public${pathname}`
    + ' does not exist. Render it from og-card.svg with the recipe in that'
    + ' file\'s header, and delete the version it replaces.',
  ).toBe(true);
});
