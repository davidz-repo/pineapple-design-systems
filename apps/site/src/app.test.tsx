import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';

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
