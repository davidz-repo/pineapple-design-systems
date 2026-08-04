import { describe, expect, it } from 'vitest';

import { PACKAGE_TABS, tabPath } from '../packageTabs';
import { REGISTRY } from '../registry';
import { pageKeyFor, pageTitleFor } from './pageIdentity';

// Read off the registry rather than named here: this file is about the mapping,
// not about which packages exist.
const [firstEntry] = REGISTRY;

describe('pageKeyFor', () => {
  it('keeps every tab of a package page on one key', () => {
    const base = pageKeyFor(`/components/${firstEntry.slug}`);
    for (const tab of PACKAGE_TABS) {
      expect(pageKeyFor(tabPath(firstEntry.slug, tab.segment))).toBe(base);
    }
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
  // Three history entries reading "Button — Pineapple UI" are three entries
  // nobody can tell apart. Driven off the tab list so a tab added there with no
  // title of its own fails here rather than titling as not found.
  it('names every tab, unlike the page key', () => {
    for (const tab of PACKAGE_TABS) {
      expect(pageTitleFor(tabPath(firstEntry.slug, tab.segment)))
        .toBe(`${firstEntry.name}${tab.titleSuffix} — Pineapple UI`);
    }
    expect(pageTitleFor(`/components/${firstEntry.slug}/`))
      .toBe(`${firstEntry.name} — Pineapple UI`);
  });

  it('titles anything unrouted as not found', () => {
    expect(pageTitleFor('/nope')).toBe('Page not found — Pineapple UI');
    expect(pageTitleFor('/components/nope')).toBe('Page not found — Pineapple UI');
    // A tab segment no route serves, and a path deeper than any route.
    expect(pageTitleFor(`/components/${firstEntry.slug}/nope`))
      .toBe('Page not found — Pineapple UI');
    expect(pageTitleFor(`/components/${firstEntry.slug}/changelog/nope`))
      .toBe('Page not found — Pineapple UI');
  });
});
