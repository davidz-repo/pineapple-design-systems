import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';

import { HomePage } from './HomePage';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// The hero is the one part of the site with behaviour of its own — the
// variant row is a real toggle group, and the CTAs are the only route into
// the rest of the docs. Rendered under the same provider tree main.tsx mounts;
// the awaited `act` matches app.test.tsx's helper (this page does not suspend,
// but the theme provider settles its preferences on mount).

async function renderHome() {
  await act(async () => {
    render(
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    );
  });
}

it('points at Getting Started and at the component grid', async () => {
  await renderHome();
  expect(screen.getByRole('link', { name: 'Get started' }))
    .toHaveAttribute('href', '/getting-started');
  expect(screen.getByRole('link', { name: 'Browse components' }))
    .toHaveAttribute('href', '#components');
});

it('selects a button variant and reflects it in the caption', async () => {
  await renderHome();
  // The row is a labelled group of toggles, not six loose buttons.
  expect(screen.getByRole('group', { name: 'Button variant' })).toBeInTheDocument();

  const soft = screen.getByRole('button', { name: 'soft' });
  expect(screen.getByRole('button', { name: 'solid' })).toHaveAttribute('aria-pressed', 'true');
  expect(soft).toHaveAttribute('aria-pressed', 'false');

  await act(async () => {
    fireEvent.click(soft);
  });

  expect(soft).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'solid' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('<Button variant="soft">Save</Button>')).toBeInTheDocument();
});
