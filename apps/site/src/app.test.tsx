import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

async function renderAt(path: string) {
  await act(async () => {
    render(
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    );
  });
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
  expect(await screen.findByRole('link', { name: /Playground/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Examples/ })).toBeInTheDocument();
  // The README (Overview tab) renders through the markdown pipeline.
  expect(await screen.findByText('What it exports')).toBeInTheDocument();
});

it('renders the playground with controls and a JSX snippet', async () => {
  await renderAt('/components/button/playground');
  // The `variant` select comes from the story's argTypes, the `label` text
  // field from its args.
  expect(await screen.findByLabelText('variant')).toBeInTheDocument();
  expect(screen.getByLabelText('label')).toBeInTheDocument();
  // The snippet reflects the story defaults: label becomes children.
  expect(screen.getByText(/<Button/)).toBeInTheDocument();
});

it('omits Examples and Playground tabs for a package with no stories', async () => {
  await renderAt('/components/tokens');
  expect(await screen.findByRole('link', { name: /Versions/ })).toBeInTheDocument();
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

it('retitles the document when the page changes', async () => {
  await renderAt('/');
  expect(document.title).toBe('Pineapple UI — React design system');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  expect(document.title).toBe('Button — Pineapple UI');

  // A tab within the same package is not a page change: same title.
  await act(async () => {
    fireEvent.click(await screen.findByRole('link', { name: /Versions/ }));
  });
  expect(document.title).toBe('Button — Pineapple UI');

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Getting started' }));
  });
  expect(document.title).toBe('Getting started — Pineapple UI');
});

it('scrolls to the top and focuses the main region on a page change only', async () => {
  await renderAt('/');
  // Arriving is not navigating: nothing is scrolled or refocused on mount.
  expect(scrollTo).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Button' }));
  });
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  expect(document.activeElement).toBe(document.getElementById('main'));

  scrollTo.mockClear();
  await act(async () => {
    fireEvent.click(await screen.findByRole('link', { name: /Examples/ }));
  });
  expect(scrollTo).not.toHaveBeenCalled();
});

it('filters the sidebar to the query and explains an empty result', async () => {
  await renderAt('/getting-started');
  const filter = screen.getByLabelText('Filter components');

  await act(async () => {
    fireEvent.change(filter, { target: { value: 'badge' } });
  });
  expect(screen.getByRole('link', { name: 'Badge' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Button' })).not.toBeInTheDocument();
  // The shell's own links are not components and survive the filter.
  expect(screen.getByRole('link', { name: 'Introduction' })).toBeInTheDocument();

  // The blurb is searched too — nothing is named "dropdown".
  await act(async () => {
    fireEvent.change(filter, { target: { value: 'localStorage' } });
  });
  expect(screen.getByRole('link', { name: 'useLocalStorage' })).toBeInTheDocument();

  await act(async () => {
    fireEvent.change(filter, { target: { value: 'zzz' } });
  });
  expect(screen.getByText('No component matches “zzz”.')).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
  });
  expect(screen.getByRole('link', { name: 'Button' })).toBeInTheDocument();
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
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('data-open', 'false');
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
