import type { ReactNode } from 'react';

import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { App } from './App';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// Render-level smoke tests: the same provider tree main.tsx mounts, on a
// memory router. These exercise the real pipeline — registry -> routes ->
// story/README globs -> Suspense — so a page that would crash in the browser
// fails here first.
//
// The render is wrapped in an awaited `act`: package pages suspend on their
// story/markdown imports, and React 19 only retries a suspended tree once
// the async act scope has flushed.

// Every wait that depends on a lazily imported story module or README is given
// this ceiling instead of testing-library's 1000ms default. Those are real
// dynamic imports of modules outside this workspace, and they have missed the
// default twice on a loaded CI runner while never missing it locally. A
// generous ceiling costs nothing when the module resolves in milliseconds,
// which is what every passing run does.
const SUSPENSE_TIMEOUT = { timeout: 10_000 };

// Clicking a link is not the same as arriving. React Router runs navigation
// inside `startTransition`, so a route whose content suspends (a package tab
// loading its stories or CHANGELOG) does not commit on the click — the old
// location stays until the import resolves. Post-navigation assertions
// therefore go through `waitFor`, which is also what keeps them honest on a
// slow runner. Asserting straight after the click reads the PREVIOUS page and
// can pass for the wrong reason.
async function expectTitle(title: string) {
  await waitFor(() => {
    expect(document.title).toBe(title);
  }, SUSPENSE_TIMEOUT);
}

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

async function renderAt(path: string, extra?: ReactNode) {
  await act(async () => {
    render(
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
            {extra}
          </MemoryRouter>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    );
  });
}

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
  expect(screen.getByRole('heading', { name: 'Pineapple UI', level: 1 })).toBeInTheDocument();
  // The Button card (the sidebar link has no blurb text).
  expect(screen.getByText('The action trigger, in six variants.')).toBeInTheDocument();
});

it('renders a package page: header, tabs, README overview', async () => {
  await renderAt('/components/button');
  expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeInTheDocument();
  // Tabs appear once the story module resolves; Playground only exists
  // because the button story exports one. Regex names: TabNav.Link renders
  // its label a second time in a measurement span that is not aria-hidden,
  // so the accessible name is the label doubled.
  expect(await screen.findByRole('link', { name: /Playground/ }, SUSPENSE_TIMEOUT))
    .toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Examples/ })).toBeInTheDocument();
  // The README (Overview tab) renders through the markdown pipeline.
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
  // The snippet reflects the story defaults: label becomes children.
  expect(screen.getByText(/<Button/)).toBeInTheDocument();
});

it('omits Examples and Playground tabs for a package with no stories', async () => {
  await renderAt('/components/tokens');
  expect(await screen.findByRole('link', { name: /Versions/ }, SUSPENSE_TIMEOUT))
    .toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Playground/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Examples/ })).not.toBeInTheDocument();
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

it('retitles the document per page and per tab', async () => {
  await renderAt('/');
  await expectTitle('Pineapple UI — React design system');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  await expectTitle('Button — Pineapple UI');

  // A tab is not a new page, but it is a new history entry — four of them
  // reading "Button — Pineapple UI" is four entries nobody can tell apart.
  await act(async () => {
    fireEvent.click(await screen.findByRole('link', { name: /Versions/ }, SUSPENSE_TIMEOUT));
  });
  await expectTitle('Button versions — Pineapple UI');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: /Playground/ }));
  });
  await expectTitle('Button playground — Pineapple UI');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Getting started' }));
  });
  await expectTitle('Getting started — Pineapple UI');
});

it('scrolls to the top and focuses the main region on a page change only', async () => {
  await renderAt('/');
  // Arriving is not navigating: nothing is scrolled or refocused on mount.
  expect(scrollTo).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  await expectTitle('Button — Pineapple UI');
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  expect(document.activeElement).toBe(document.getElementById('main'));

  // A tab: the title proves the navigation landed, so "no scroll" is a
  // statement about a navigation that happened, not about one that did not.
  scrollTo.mockClear();
  await act(async () => {
    fireEvent.click(await screen.findByRole('link', { name: /Examples/ }, SUSPENSE_TIMEOUT));
  });
  await expectTitle('Button examples — Pineapple UI');
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
  await expectTitle('Getting started — Pineapple UI');
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
  await expectTitle('Button — Pineapple UI');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'test-only: back' }));
  });
  await expectTitle('Pineapple UI — React design system');
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
