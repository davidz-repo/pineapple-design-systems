import { act } from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { useNavigate } from 'react-router';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// The stylesheet as TEXT, not as styling: jsdom applies none of this, and the
// wordmark test below reads one constant back out of it. `?raw` is how the rest
// of this app already reads source it means to inspect rather than run — see
// stories.ts and content.ts.
import siteCss from './site.css?raw';

import {
  expectTitle,
  findTabLink,
  findTabStrip,
  renderApp as renderAt,
  SUSPENSE_TIMEOUT,
} from './test-helpers';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// Render-level smoke tests: the same provider tree main.tsx mounts, on a
// memory router. These exercise the real pipeline — registry -> routes ->
// story/README globs -> Suspense — so a page that would crash in the browser
// fails here first. What the package page does with its tabs, examples and
// links has its own file next to it; test-helpers.tsx holds the render and the
// waits both files use.

// jsdom has no layout, so its `window.scrollTo` is an unimplemented stub that
// logs on every call. Replacing it silences that and makes the shell's
// scroll-to-top on navigation something a test can actually see.
const scrollTo = vi.fn();

beforeEach(() => {
  scrollTo.mockClear();
  vi.stubGlobal('scrollTo', scrollTo);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// A real history POP for the tests that need one. MemoryRouter's history is
// synchronous, so this is a genuine back navigation without waiting on
// jsdom's popstate task.
function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        void navigate(-1);
      }}
    >
      test-only: back
    </button>
  );
}

it('renders the home page with a card per registry entry', async () => {
  await renderAt('/');
  expect(screen.getByRole('heading', { name: 'Pineapple Design', level: 1 })).toBeInTheDocument();
  // The Button card (the sidebar link has no blurb text).
  expect(screen.getByText('The action trigger, in six variants.')).toBeInTheDocument();
});

it('renders a package page: header, tabs, examples then README', async () => {
  await renderAt('/components/button');
  expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeInTheDocument();
  // Tabs appear once the story module resolves; Playground only exists
  // because the button story exports one.
  expect(await findTabLink(/Playground/)).toBeInTheDocument();
  // Examples are no longer a tab: they open the Overview.
  expect(within(await findTabStrip()).queryByRole('link', { name: /Examples/ }))
    .not
    .toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Examples' }, SUSPENSE_TIMEOUT))
    .toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Variants', level: 3 })).toBeInTheDocument();
  // The README follows, through the markdown pipeline.
  expect(await screen.findByText('What it exports', undefined, SUSPENSE_TIMEOUT))
    .toBeInTheDocument();
});

it('renders the playground with controls and a JSX snippet', async () => {
  await renderAt('/components/button/playground');
  // The `variant` select comes from the story's argTypes, the `label` text
  // field from its args.
  expect(await screen.findByLabelText('variant', undefined, SUSPENSE_TIMEOUT))
    .toBeInTheDocument();
  expect(screen.getByLabelText('label')).toBeInTheDocument();
  // The snippet reflects the story defaults: label becomes children. Read off
  // the elements because they are highlighted — every token is its own span —
  // and the install line is a code block on this page too.
  const codeBlocks = Array.from(document.querySelectorAll('.code-block pre'))
    .map(block => block.textContent);
  expect(codeBlocks).toContainEqual(expect.stringContaining('<Button variant="solid"'));
  expect(codeBlocks).toContainEqual(expect.stringContaining('Click me</Button>'));
});

it('omits the Playground tab for a package with no stories', async () => {
  await renderAt('/components/tokens');
  expect(await findTabLink(/Changelog/)).toBeInTheDocument();
  expect(within(await findTabStrip()).queryByRole('link', { name: /Playground/ }))
    .not
    .toBeInTheDocument();
  // No stories, so the Overview is the README and nothing else.
  expect(screen.queryByRole('heading', { name: 'Examples' })).not.toBeInTheDocument();
});

it('shows the not-found page for an unknown package', async () => {
  await renderAt('/components/does-not-exist');
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});

// ---- App shell -------------------------------------------------------
//
// Clicks go through `fireEvent` inside an awaited `act` for the same reason
// the render does: following a link into a package page suspends.

it('opens with a skip link that targets the main region', async () => {
  await renderAt('/');
  const skipLink = screen.getByRole('link', { name: 'Skip to content' });
  expect(skipLink).toHaveAttribute('href', '#main');
  // The target exists and is the element the link claims: a skip link
  // pointing at nothing looks identical until someone presses Tab.
  const main = document.getElementById('main');
  expect(main?.tagName).toBe('MAIN');
  expect(main).toHaveAttribute('tabindex', '-1');
});

// Every control the header renders, in document order, each named by the class
// site.css's 860px block switches on. `.site-appearance-segments` and
// `.site-appearance-cycle` are one control in two forms — CSS shows exactly one
// per viewport — and the segmented control's three radios are internal to it,
// so neither counts twice. `.site-docs-badge` is not here because a badge is
// not a control; it is dropped by the same block for width all the same.
const HEADER_CONTROLS = [
  'site-header-brand',
  'site-appearance-segments',
  'site-appearance-cycle',
  'site-header-link',
  'site-menu-trigger',
];

const WORDMARK_CLAMP = [
  'The phone header holds ONE ROW only because site.css scales the wordmark with',
  'a clamp — `.site-header-wordmark` in the `@media (max-width: 860px)` block —',
  'whose 219.6px constant was measured against exactly the controls listed above.',
  'Nothing measures the row at runtime, so adding or removing a header control',
  'wraps the header to two rows below ~484px with no other warning, and every',
  'sticky rail that reads --site-header-h then sits ~44px under the chrome.',
  'Re-derive that clamp in apps/site/src/site.css, then update this list.',
].join('\n');

it('renders exactly the header controls the wordmark clamp was derived from', async () => {
  await renderAt('/');
  const header = document.querySelector('header.site-header');
  expect(header).not.toBeNull();

  // A radiogroup is one control: keep the group, drop the radios inside it.
  const controls = Array.from(
    header?.querySelectorAll('a, button, input, select, textarea, [role="radiogroup"]') ?? [],
  ).filter(element => element.matches('[role="radiogroup"]')
    || element.closest('[role="radiogroup"]') === null);

  const named = controls.map(element => HEADER_CONTROLS
    .find(name => element.classList.contains(name))
    ?? `UNNAMED CONTROL: ${element.outerHTML.slice(0, 120)}`);

  expect(named, WORDMARK_CLAMP).toEqual(HEADER_CONTROLS);
});

// The clamp's OTHER constant, and the one the control list above cannot see.
// 219.6 is the row MINUS the label, so it belongs to that list; the divisor is
// the LABEL — the wordmark's own px of width per px of type, measured 149.859
// at 17.6px, i.e. 8.5147, rounded DOWN to 8.5. That is not the move the old
// name's 13 was: "Pineapple Design Systems" measured 228.594px, i.e. 12.9883,
// which was rounded UP. The two directions are not interchangeable — a LARGER
// divisor shrinks the label and ADDS slack, a SMALLER one grows it and SPENDS
// slack — so 8.5 is the spending one, and it is fine only because the row has
// 11.59px of cushion at 390px to spend from.
//
// Nothing at runtime connects the divisor to the string Layout.tsx renders, and
// getting it wrong fails silently in whichever direction the edit went: a
// longer name wraps the phone header to two rows, a shorter one shrinks the
// label for room it is no longer using (the rename this test was added for left
// the divisor at 13 and rendered 10.4px at 390px with 58px of the row empty).
//
// jsdom measures no text, so this cannot re-derive the number — it pins the
// PAIR, which is enough to make the edit that invalidates it loud.
const WORDMARK_TEXT = 'Pineapple Design';
const WORDMARK_DIVISOR = '8.5';

// EVERY `.site-header-wordmark` rule that sets a font-size, in file order —
// `/g` and `matchAll` rather than `match`, for a hole this guard shipped with:
// the LAST declaration is the one the browser uses, so a second rule further
// down site.css overrides this clamp while a first-match read goes on reporting
// the divisor it was just superseded by. Verified — a second block at ÷13
// appended to site.css left the old form of this test reading 8.5 and passing.
const WORDMARK_FONT_SIZE = /\.site-header-wordmark\s*\{[^}]*?font-size:\s*([^;}]+)/g;
const WORDMARK_CLAMP_SHAPE = /^clamp\(\s*10px\s*,\s*calc\(\(100cqi - 219\.6px\)\s*\/\s*([\d.]+)\)/;

// Shared tail: whichever way this test fails, the way out is a re-measurement.
const WORDMARK_REMEASURE = [
  '',
  'If you changed the wordmark, re-measure it: render the header wide enough',
  'that the clamp is at its --font-size-3 ceiling, take the text\'s width, and',
  'divide by that font size (17.6px at the pinned 110% scale). Round to one',
  'decimal, and mind which way: UP shrinks the label and buys slack, DOWN grows',
  'it and spends slack, so round DOWN only while the row still has cushion to',
  'spare (8.5 from the measured 8.5147 keeps 11.59px at 390px). Then update the',
  'clamp, this constant, and the measurements quoted in that rule\'s comment.',
].join('\n');

const WORDMARK_DIVISOR_MESSAGE = [
  `The header wordmark and the divisor in its clamp disagree. The clamp —`,
  '`.site-header-wordmark` in site.css\'s `@media (max-width: 860px)` block —',
  'divides by the LABEL\'s width per px of type, so it is only correct for the',
  'exact string the header renders.',
  WORDMARK_REMEASURE,
].join('\n');

const WORDMARK_ONE_RULE_MESSAGE = [
  'site.css sets `.site-header-wordmark`\'s font-size in more than one rule.',
  'This is NOT "the divisor is wrong": it is that there is now more than one',
  'divisor, the browser uses the LAST of them, and this test can only pin one.',
  'Collapse them back to a single rule — or teach this test which one is live —',
  'before trusting the divisor assertion below it.',
  WORDMARK_REMEASURE,
].join('\n');

const WORDMARK_SHAPE_MESSAGE = [
  'The .site-header-wordmark clamp is no longer in the shape this test reads —',
  '`clamp(10px, calc((100cqi - 219.6px) / <divisor>), ...)` — so neither the',
  'divisor nor the 219.6px offset is being checked at all any more.',
  WORDMARK_REMEASURE,
].join('\n');

it('keeps the wordmark clamp divisor in step with the wordmark itself', async () => {
  await renderAt('/');
  const wordmark = document.querySelector('.site-header-wordmark');
  expect(wordmark?.textContent, WORDMARK_DIVISOR_MESSAGE).toBe(WORDMARK_TEXT);

  const declarations = [...siteCss.matchAll(WORDMARK_FONT_SIZE)]
    .map(([, value = '']) => value.trim());
  expect(declarations, WORDMARK_ONE_RULE_MESSAGE).toHaveLength(1);

  const clamp = declarations[0]?.match(WORDMARK_CLAMP_SHAPE) ?? null;
  expect(clamp, WORDMARK_SHAPE_MESSAGE).not.toBeNull();
  expect(clamp?.[1], WORDMARK_DIVISOR_MESSAGE).toBe(WORDMARK_DIVISOR);
});

it('retitles the document per page and per tab', async () => {
  await renderAt('/');
  await expectTitle('Pineapple Design — React components on Radix Themes');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  await expectTitle('Button — Pineapple Design');

  // A tab is not a new page, but it is a new history entry — three of them
  // reading "Button — Pineapple Design" is three entries nobody can tell apart.
  await act(async () => {
    fireEvent.click(await findTabLink(/Changelog/));
  });
  await expectTitle('Button changelog — Pineapple Design');

  await act(async () => {
    fireEvent.click(await findTabLink(/Playground/));
  });
  await expectTitle('Button playground — Pineapple Design');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Getting started' }));
  });
  await expectTitle('Getting started — Pineapple Design');
});

it('scrolls to the top and focuses the main region on a page change only', async () => {
  await renderAt('/');
  // Arriving is not navigating: nothing is scrolled or refocused on mount.
  expect(scrollTo).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  await expectTitle('Button — Pineapple Design');
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  expect(document.activeElement).toBe(document.getElementById('main'));

  // A tab: the title proves the navigation landed, so "no scroll" is a
  // statement about a navigation that happened, not about one that did not.
  scrollTo.mockClear();
  await act(async () => {
    fireEvent.click(await findTabLink(/Changelog/));
  });
  await expectTitle('Button changelog — Pineapple Design');
  expect(scrollTo).not.toHaveBeenCalled();
});

it('filters the sidebar to the query, announcing what is left', async () => {
  await renderAt('/getting-started');
  const filter = screen.getByLabelText('Filter packages');

  await act(async () => {
    fireEvent.change(filter, { target: { value: 'badge' } });
  });
  expect(screen.getByRole('link', { name: 'Badge' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Button' })).not.toBeInTheDocument();
  // The shell's own links are not packages and survive the filter.
  expect(screen.getByRole('link', { name: 'Introduction' })).toBeInTheDocument();
  // The narrowing is announced, not just rendered: the status region carries
  // the count for every non-empty query.
  const status = screen.getByRole('status');
  expect(status).toHaveTextContent('1 package matches “badge”.');

  // The blurb is searched too — the package is named "useLocalStorage".
  await act(async () => {
    fireEvent.change(filter, { target: { value: 'persisted to local' } });
  });
  expect(screen.getByRole('link', { name: 'useLocalStorage' })).toBeInTheDocument();

  await act(async () => {
    fireEvent.change(filter, { target: { value: 'text' } });
  });
  expect(status).toHaveTextContent('3 packages match “text”.');

  await act(async () => {
    fireEvent.change(filter, { target: { value: 'zzz' } });
  });
  expect(screen.getByText('No package matches “zzz”.')).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
  });
  expect(screen.getByRole('link', { name: 'Button' })).toBeInTheDocument();
  expect(status).toBeEmptyDOMElement();
});

it('discloses the nav panel from the header and closes it on navigation', async () => {
  await renderAt('/');
  const trigger = screen.getByRole('button', { name: 'Menu' });
  const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
  expect(panel?.tagName).toBe('NAV');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('data-open', 'false');

  await act(async () => {
    fireEvent.click(trigger);
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(panel).toHaveAttribute('data-open', 'true');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Getting started' }));
  });
  await expectTitle('Getting started — Pineapple Design');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('data-open', 'false');
});

it('keeps focus on the trigger when the panel link is the current page', async () => {
  await renderAt('/');
  const trigger = screen.getByRole('button', { name: 'Menu' });

  await act(async () => {
    fireEvent.click(trigger);
  });
  // "Introduction" while already at "/": the panel closes, but no page
  // changed, so nothing else is going to move focus. Without the trigger
  // taking it back, focus would be on a link inside a hidden panel — i.e. on
  // <body>, at the top of the tab order.
  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Introduction' }));
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(trigger);
});

it('does not reopen the panel when history returns to the page it was opened on', async () => {
  await renderAt('/', <BackButton />);
  const trigger = screen.getByRole('button', { name: 'Menu' });

  await act(async () => {
    fireEvent.click(trigger);
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');

  // Leave through a link the panel knows nothing about (a home-page card),
  // so nothing clears the open state on the way out.
  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: /The action trigger/ }));
  });
  await expectTitle('Button — Pineapple Design');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'test-only: back' }));
  });
  await expectTitle('Pineapple Design — React components on Radix Themes');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('closes the nav panel on Escape and hands focus back to the trigger', async () => {
  await renderAt('/');
  const trigger = screen.getByRole('button', { name: 'Menu' });

  await act(async () => {
    fireEvent.click(trigger);
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await act(async () => {
    fireEvent.keyDown(document, { key: 'Escape' });
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(trigger);
});
