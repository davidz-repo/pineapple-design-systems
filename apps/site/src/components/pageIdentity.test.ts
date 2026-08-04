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

  it('passes the top-level pages through', () => {
    expect(pageKeyFor('/')).toBe('/');
    expect(pageKeyFor('/getting-started')).toBe('/getting-started');
  });
});

describe('pageTitleFor', () => {
  it('names the site on the home page and the page on every other', () => {
    expect(pageTitleFor(pageKeyFor('/'))).toBe('Pineapple UI — React design system');
    expect(pageTitleFor(pageKeyFor('/getting-started'))).toBe('Getting started — Pineapple UI');
    expect(pageTitleFor(pageKeyFor(`/components/${firstEntry.slug}/playground`)))
      .toBe(`${firstEntry.name} — Pineapple UI`);
  });

  it('titles anything unrouted as not found', () => {
    expect(pageTitleFor(pageKeyFor('/nope'))).toBe('Page not found — Pineapple UI');
    expect(pageTitleFor(pageKeyFor('/components/nope'))).toBe('Page not found — Pineapple UI');
  });
});
