import { describe, expect, it } from 'vitest';

import { REGISTRY } from '../registry';
import { pageKeyFor, pageTitleFor } from './pageIdentity';

// Read off the registry rather than named here: this file is about the mapping,
// not about which packages exist.
const [firstEntry] = REGISTRY;

describe('pageKeyFor', () => {
  it('keeps every tab of a package page on one key', () => {
    const base = pageKeyFor(`/components/${firstEntry.slug}`);
    expect(pageKeyFor(`/components/${firstEntry.slug}/examples`)).toBe(base);
    expect(pageKeyFor(`/components/${firstEntry.slug}/playground`)).toBe(base);
    expect(pageKeyFor(`/components/${firstEntry.slug}/versions`)).toBe(base);
  });

  it('separates two package pages', () => {
    const [, second] = REGISTRY;
    expect(pageKeyFor(`/components/${second.slug}`))
      .not
      .toBe(pageKeyFor(`/components/${firstEntry.slug}`));
  });

  it('passes the top-level pages through, trailing slash or not', () => {
    expect(pageKeyFor('/')).toBe('/');
    expect(pageKeyFor('/getting-started')).toBe('/getting-started');
    expect(pageKeyFor('/getting-started/')).toBe('/getting-started');
  });
});

describe('pageTitleFor', () => {
  it('names the site on the home page and the page on every other', () => {
    expect(pageTitleFor('/')).toBe('Pineapple UI — React design system');
    expect(pageTitleFor('/getting-started')).toBe('Getting started — Pineapple UI');
    expect(pageTitleFor(`/components/${firstEntry.slug}`))
      .toBe(`${firstEntry.name} — Pineapple UI`);
  });

  // The key deliberately collapses the tabs; the title deliberately does not.
  // Four history entries reading "Button — Pineapple UI" are four entries
  // nobody can tell apart.
  it('names the tab, unlike the page key', () => {
    expect(pageTitleFor(`/components/${firstEntry.slug}/examples`))
      .toBe(`${firstEntry.name} examples — Pineapple UI`);
    expect(pageTitleFor(`/components/${firstEntry.slug}/playground`))
      .toBe(`${firstEntry.name} playground — Pineapple UI`);
    expect(pageTitleFor(`/components/${firstEntry.slug}/versions`))
      .toBe(`${firstEntry.name} versions — Pineapple UI`);
    expect(pageTitleFor(`/components/${firstEntry.slug}/`))
      .toBe(`${firstEntry.name} — Pineapple UI`);
  });

  it('titles anything unrouted as not found', () => {
    expect(pageTitleFor('/nope')).toBe('Page not found — Pineapple UI');
    expect(pageTitleFor('/components/nope')).toBe('Page not found — Pineapple UI');
    // A tab segment no route serves, and a path deeper than any route.
    expect(pageTitleFor(`/components/${firstEntry.slug}/nope`))
      .toBe('Page not found — Pineapple UI');
    expect(pageTitleFor(`/components/${firstEntry.slug}/versions/nope`))
      .toBe('Page not found — Pineapple UI');
  });
});
