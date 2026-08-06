import { afterEach, describe, expect, it } from 'vitest';

import { focusNextTabbableFrom, nextTabbableFrom } from './nextTabbable';

// The scan the `Tab` patch computes its destination with, tested DIRECTLY rather
// than only through the six integration tests that Tab out of a real menu. It is
// hand-rolled DOM walking, three of `isUnreachable`'s four branches are
// unreachable from a rendered menu (nothing in one is disabled, `[hidden]` or a
// hidden input), and the documented limits are claims about behaviour that
// nothing was checking.

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

function named(name: string): HTMLElement {
  const element = document.querySelector(`[data-name="${name}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`no [data-name="${name}"] in the test DOM`);
  }
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('nextTabbableFrom', () => {
  it('steps one place forward and one place back through document order', () => {
    mount(`
      <button type="button" data-name="first">first</button>
      <button type="button" data-name="second">second</button>
      <button type="button" data-name="third">third</button>
    `);
    expect(nextTabbableFrom(named('second'), 'forward')).toBe(named('third'));
    expect(nextTabbableFrom(named('second'), 'backward')).toBe(named('first'));
  });

  it('counts every element with a non-negative tabIndex, not just form controls', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <div tabindex="0" data-name="widget">a focusable div</div>
      <div data-name="plain">not focusable</div>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('widget'));
  });

  it('returns null off either end of the document, rather than wrapping', () => {
    mount(`
      <button type="button" data-name="only">only</button>
    `);
    expect(nextTabbableFrom(named('only'), 'forward')).toBeNull();
    expect(nextTabbableFrom(named('only'), 'backward')).toBeNull();
  });

  it('returns null when the element it is asked to step from is not tabbable itself', () => {
    mount(`
      <div data-name="from">not tabbable</div>
      <button type="button" data-name="after">after</button>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBeNull();
  });

  // The four branches of `isUnreachable`, one test each: tabbable by `tabIndex`
  // and still not somewhere focus can usefully land.
  it('steps over a disabled control', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <button type="button" disabled data-name="off">disabled</button>
      <button type="button" data-name="after">after</button>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('after'));
  });

  it('steps over an element carrying the hidden attribute', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <button type="button" hidden data-name="off">hidden</button>
      <button type="button" data-name="after">after</button>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('after'));
  });

  it('steps over a hidden input', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <input type="hidden" data-name="off" />
      <button type="button" data-name="after">after</button>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('after'));
  });

  it('steps over one of Radix\'s own focus sentinels', () => {
    // `@radix-ui/react-focus-guards` parks a tabbable span at each edge of
    // `<body>` while a modal layer is up. Landing focus on one is visibly nothing,
    // and every modal menu in this package puts them there.
    mount(`
      <button type="button" data-name="from">from</button>
      <span tabindex="0" data-radix-focus-guard="" data-name="off"></span>
      <button type="button" data-name="after">after</button>
    `);
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('after'));
  });

  // The two limits the README publishes as limits. Pinned so each is a
  // MEASUREMENT of what this scan does rather than a claim in a comment — and so
  // that a future implementation of either fails here, where the README sentence
  // to delete is named, instead of quietly changing behaviour.
  it('ignores positive tabindex ordering, answering in document order', () => {
    mount(`
      <button type="button" tabindex="2" data-name="from">from</button>
      <button type="button" tabindex="0" data-name="next-in-document-order">plain</button>
      <button type="button" tabindex="1" data-name="first-for-the-browser">tabindex 1</button>
    `);
    // A browser would visit `tabindex="1"` before any `tabindex="0"`. Honouring
    // that means implementing the whole two-pass sequential focus navigation
    // order, which the README says this does not do.
    expect(nextTabbableFrom(named('from'), 'forward'))
      .toBe(named('next-in-document-order'));
  });

  it('does not read CSS visibility, so a tabbable inside a hidden subtree is a candidate', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <div style="display: none">
        <button type="button" data-name="invisible">invisible</button>
      </div>
      <button type="button" data-name="after">after</button>
    `);
    // jsdom does no layout, so this cannot be fixed by reading the layout: an
    // `offsetParent` or `checkVisibility()` test would answer "invisible" for
    // every element in this suite. It is the fifth published limit, and it is why
    // `focusNextTabbableFrom` checks where focus actually went.
    expect(nextTabbableFrom(named('from'), 'forward')).toBe(named('invisible'));
  });
});

describe('focusNextTabbableFrom', () => {
  it('focuses the next tabbable element and reports it', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <button type="button" data-name="after">after</button>
    `);
    expect(focusNextTabbableFrom(named('from'), 'forward')).toBe(named('after'));
    expect(document.activeElement).toBe(named('after'));
  });

  it('clamps to where it started when there is nothing further to tab to', () => {
    mount(`
      <button type="button" data-name="only">only</button>
    `);
    expect(focusNextTabbableFrom(named('only'), 'forward')).toBe(named('only'));
    expect(document.activeElement).toBe(named('only'));
  });

  it('falls back to where it started when the element it chose refuses focus', () => {
    mount(`
      <button type="button" data-name="from">from</button>
      <div style="display: none">
        <button type="button" data-name="invisible">invisible</button>
      </div>
    `);
    // What a browser does with an element inside a `display: none` subtree:
    // `.focus()` is a NO-OP. jsdom has no layout and focuses it happily, which is
    // exactly why no rendered test in this package can catch the class of bug this
    // fallback exists for — so the no-op is installed here rather than hoped for.
    Object.defineProperty(named('invisible'), 'focus', { value: () => {} });

    expect(
      focusNextTabbableFrom(named('from'), 'forward'),
      'focus was left on an element that refused it. Everything the scan cannot see — CSS '
      + 'visibility, `inert`, a positive-tabindex ordering it does not implement — ends here, as '
      + 'focus on <body>, unless focusNextTabbableFrom in src/nextTabbable.ts checks where focus '
      + 'actually landed and falls back.',
    ).toBe(named('from'));
    expect(document.activeElement).toBe(named('from'));
  });
});
