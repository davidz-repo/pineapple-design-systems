// @vitest-environment node
//
// The link derivations, without rendering anything. `MarkdownView.test.tsx`
// asserts what a README's links become on the page; this asserts the rule
// underneath them, which is the half that decides whether a link leaves the
// site at all.

import { describe, expect, it } from 'vitest';

import { internalRouteFor, npmUrlFor, radixDocsUrl, sourceUrlFor } from './packageLinks';

describe('internalRouteFor', () => {
  it('keeps a link to this site inside this site', () => {
    // Ten package READMEs point at their own docs page, because a README is
    // read on npm and on GitHub too and an absolute URL is the only form that
    // works in all three places. Read HERE that URL is the page the reader is
    // already standing on, and left alone it opens a second tab onto it.
    expect(internalRouteFor('https://designpineapple.com/components/button'))
      .toBe('/components/button');
    expect(internalRouteFor('https://designpineapple.com/components/text-field'))
      .toBe('/components/text-field');
  });

  it('carries the rest of the address through', () => {
    expect(internalRouteFor('https://designpineapple.com/components/box/changelog'))
      .toBe('/components/box/changelog');
    expect(internalRouteFor('https://designpineapple.com/components/box?tab=1#props'))
      .toBe('/components/box?tab=1#props');
    // Every address on this host is this app's to answer, including the ones it
    // answers with "page not found" — which is still the right answer to give
    // in place rather than in a new tab.
    expect(internalRouteFor('https://designpineapple.com/nothing-here')).toBe('/nothing-here');
  });

  it('still routes a sibling package\'s source URL to that package\'s page', () => {
    // The original case, and derived from the same function that BUILDS those
    // URLs, so a README's cross-link and the site's own idea of it cannot drift.
    const source = sourceUrlFor('button');
    expect(source).toBeDefined();
    expect(internalRouteFor(source as string)).toBe('/components/button');
    expect(internalRouteFor(`${source as string}/`)).toBe('/components/button');
  });

  it('leaves a genuinely external address alone', () => {
    expect(internalRouteFor(radixDocsUrl({ name: 'Box', path: 'components/box' })))
      .toBeUndefined();
    expect(internalRouteFor(npmUrlFor('button') as string)).toBeUndefined();
    expect(internalRouteFor('https://example.com/components/button')).toBeUndefined();
    // A near miss on the host, which is the one that would be embarrassing.
    expect(internalRouteFor('https://designpineapple.com.evil.test/components/button'))
      .toBeUndefined();
    // Markdown carries whatever an author wrote, including things that are not
    // absolute URLs at all.
    expect(internalRouteFor('./CHANGELOG.md')).toBeUndefined();
    expect(internalRouteFor('mailto:someone@example.com')).toBeUndefined();
  });
});
