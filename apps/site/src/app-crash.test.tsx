import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, silenceCaughtErrors } from './test-helpers';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// The app's last-resort boundary (App.tsx), which every other test is written
// to stay out of. It needs a file of its own because reaching it means breaking
// the SHELL — a boundary below it would catch anything thrown inside a page —
// and the shell is mocked for the whole module once it is mocked at all.
//
// The Sidebar is the piece chosen to break: it is rendered by Layout, inside
// the Routes the boundary wraps, and it is not something any other assertion in
// this file depends on.

vi.mock('./components/Sidebar', () => ({
  Sidebar: () => {
    throw new Error('the shell itself broke');
  },
}));

describe('appCrash', () => {
  it('replaces the crashed app with a message and two ways out', async () => {
    const consoleError = silenceCaughtErrors();
    await renderApp('/');

    // Not a white screen, and not the router's 404 either: the app stopped
    // rendering, which is a different fact from the address being wrong.
    expect(screen.getByRole('heading', { name: 'Something went wrong', level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText('the shell itself broke')).toBeInTheDocument();

    // Retry clears the caught error and re-renders; the reload discards the
    // running app, which is the only way past a failure that repeats.
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reload the site' })).toHaveAttribute('href', '/');

    consoleError.mockRestore();
  });

  it('keeps the basename in the way out, so the address resolves', async () => {
    const consoleError = silenceCaughtErrors();
    // Served from a subpath — which GitHub Pages does whenever the custom
    // domain is not in play. The way out is a real document load, so its href
    // has to be the app's root and not the SERVER's: `/` would land on a page
    // this app was never deployed at. `useHref` is what makes the difference,
    // and nothing can tell it from a literal until the basename is not empty.
    await renderApp('/pineapple-design-system/', undefined, '/pineapple-design-system');

    expect(screen.getByRole('link', { name: 'Reload the site' }))
      .toHaveAttribute('href', expect.stringContaining('/pineapple-design-system'));

    consoleError.mockRestore();
  });
});
