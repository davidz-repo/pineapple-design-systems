import type { ReactNode } from 'react';
import { act } from 'react';

import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

import { render, screen, waitFor, within } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemoryRouter } from 'react-router';
import { expect, vi } from 'vitest';

import { App } from './App';

// Shared by every test in this workspace: what the packages look like on disk,
// and how to put the real app on screen. Both halves are here because both are
// answers to "what does a test need that is not the thing under test".

// apps/site/src/ -> repo root is three levels up.
export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

interface PackageManifest {
  /** What it publishes under — the name an install command has to say. */
  name: string;
  private?: boolean;
  peerDependencies?: Record<string, string>;
}

/** A package's manifest as it sits on disk, for tests that assert against it. */
export function readPackageManifest(slug: string): PackageManifest {
  return JSON.parse(
    readFileSync(path.join(repoRoot, 'packages', slug, 'package.json'), 'utf8'),
  ) as PackageManifest;
}

// Directory names under packages/ whose manifest is not private — the set the
// registry and the alias fences must both cover exactly.
export function listPublicPackages(): string[] {
  return readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => readPackageManifest(entry.name).private !== true)
    .map(entry => entry.name)
    .sort();
}

// ---- Rendering the real app ------------------------------------------

// Every wait that depends on a lazily imported story module, README or story
// source is given this ceiling instead of testing-library's 1000ms default.
// Those are real dynamic imports of modules outside this workspace, and they
// have missed the default twice on a loaded CI runner while never missing it
// locally. A generous ceiling costs nothing when the module resolves in
// milliseconds, which is what every passing run does.
export const SUSPENSE_TIMEOUT = { timeout: 10_000 };

/**
 * The app on a memory router, in the same provider tree main.tsx mounts. The
 * render is wrapped in an awaited `act`: package pages suspend on their story
 * and markdown imports, and React 19 only retries a suspended tree once the
 * async act scope has flushed.
 *
 * `basename` is for the tests that are about addresses the app BUILDS rather
 * than routes it serves — an `href` written through `useHref` is
 * indistinguishable from a hard-coded one until the app is served from a
 * subpath. `path` includes the basename, the way a real URL does.
 */
export async function renderApp(
  path: string,
  extra?: ReactNode,
  basename?: string,
): Promise<void> {
  await act(async () => {
    render(
      <ThemePreferencesProvider>
        <DesignSystemProvider>
          <MemoryRouter basename={basename} initialEntries={[path]}>
            <App />
            {extra}
          </MemoryRouter>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    );
  });
}

// Clicking a link is not the same as arriving. React Router runs navigation
// inside `startTransition`, so a route whose content suspends (a package tab
// loading its stories or CHANGELOG) does not commit on the click — the old
// location stays until the import resolves. Post-navigation assertions
// therefore go through `waitFor`, which is also what keeps them honest on a
// slow runner. Asserting straight after the click reads the PREVIOUS page and
// can pass for the wrong reason.
export async function expectTitle(title: string): Promise<void> {
  await waitFor(() => {
    expect(document.title).toBe(title);
  }, SUSPENSE_TIMEOUT);
}

/**
 * The package page's tab strip, once the story module it waits on has resolved.
 * Tab links are looked up inside it and never on the page: "Changelog" is also
 * a link in the row under the package title, and a bare `getByRole` matches
 * both.
 */
export async function findTabStrip(): Promise<HTMLElement> {
  return screen.findByRole('navigation', { name: 'Package tabs' }, SUSPENSE_TIMEOUT);
}

/**
 * One tab, by a REGEX name: TabNav.Link renders its label a second time in a
 * measurement span that is not aria-hidden, so a tab's accessible name is the
 * label doubled.
 */
export async function findTabLink(name: RegExp): Promise<HTMLElement> {
  return within(await findTabStrip()).getByRole('link', { name });
}

/**
 * Quiet for a test that throws on purpose. React logs every error a boundary
 * catches through its default `onCaughtError` — the right behavior, and pure
 * noise in a suite whose subject is the fallback. Restore it in the same test:
 * silencing this globally would hide the throws nobody asked for.
 */
export function silenceCaughtErrors(): { mockRestore: () => void } {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}
