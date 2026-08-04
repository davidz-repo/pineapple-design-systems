import { act } from 'react';

import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  findTabStrip,
  renderApp,
  silenceCaughtErrors,
  SUSPENSE_TIMEOUT,
} from '../../test-helpers';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// What the package page does with a package, on the real pipeline: the story
// globs, the READMEs and the manifests are all the ones on disk. The one thing
// mocked is a story that throws, because no package ships one — and a boundary
// nobody has seen catch anything is a boundary nobody knows is wired up.

const BROKEN_SLUG = 'badge';

const { brokenStories } = vi.hoisted(() => {
  function Broken(): string {
    throw new Error('this story is broken');
  }
  function Fine(): string {
    return 'a working example';
  }
  // A stable promise, not a fresh one per call: `use()` needs the same instance
  // across render retries — the same reason content.ts caches its loaders.
  return { brokenStories: Promise.resolve({ Broken, Fine }) };
});

vi.mock('../../stories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../stories')>();
  return {
    ...actual,
    // eslint-disable-next-line ts/promise-function-async -- same rule as the real loader: `async` would mint a fresh promise per call and break `use()` identity
    storyModuleFor: (slug: string) => (
      slug === BROKEN_SLUG ? brokenStories : actual.storyModuleFor(slug)
    ),
  };
});

describe('overview tab', () => {
  it('opens with the examples, above the README', async () => {
    await renderApp('/components/button');

    const examples = await screen.findByRole('heading', { name: 'Examples' }, SUSPENSE_TIMEOUT);
    const readmeHeading = await screen.findByText('What it exports', undefined, SUSPENSE_TIMEOUT);
    // Order is the claim, so the assertion is about order — through the DOM's
    // own comparison rather than an index into a query, which would only say
    // the two exist. DOCUMENT_POSITION_FOLLOWING: the README comes after.
    expect(examples.compareDocumentPosition(readmeHeading) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it('discloses each example\'s own source on demand', async () => {
    await renderApp('/components/button');

    // One per example, and collapsed: the source is opt-in, and the region it
    // controls is in the document from the start so `aria-controls` names
    // something real.
    const toggles = await screen.findAllByRole(
      'button',
      { name: 'Show code' },
      SUSPENSE_TIMEOUT,
    );
    expect(toggles.length).toBeGreaterThan(1);

    const [toggle] = toggles;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Hide code');
    // The story file's own text, cut to this export — not a snippet the site
    // wrote. `textContent` because the highlighter splits it across spans.
    expect(region?.textContent).toContain('export function Variants()');
    expect(region?.textContent).toContain('<Button variant="ghost">Ghost</Button>');
    expect(region?.textContent).not.toContain('export function Loading()');

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle).toHaveTextContent('Show code');
    expect(region?.textContent).toBe('');
  });

  it('keeps a broken example inside its own canvas', async () => {
    const consoleError = silenceCaughtErrors();
    await renderApp(`/components/${BROKEN_SLUG}`);

    expect(await screen.findByText('This example failed to render.', undefined, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
    expect(screen.getByText('this story is broken')).toBeInTheDocument();
    // Everything around it still drew: the other example, the page header and
    // the tab strip. That is the whole point of a boundary per example.
    expect(screen.getByText('a working example')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Badge', level: 1 })).toBeInTheDocument();
    expect(await findTabStrip()).toBeInTheDocument();

    consoleError.mockRestore();
  });
});

describe('package links', () => {
  it('derives source, npm, changelog and Radix links from the package data', async () => {
    await renderApp('/components/button');
    const links = within(screen.getByRole('navigation', { name: 'Button links' }));

    expect(links.getByRole('link', { name: 'View source' })).toHaveAttribute(
      'href',
      'https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/button',
    );
    expect(links.getByRole('link', { name: 'npm' })).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/@pineappleui/button',
    );
    expect(links.getByRole('link', { name: 'Radix Button' })).toHaveAttribute(
      'href',
      'https://www.radix-ui.com/themes/docs/components/button',
    );
    // The changelog is a tab on this page, so it is an internal navigation.
    const changelog = links.getByRole('link', { name: 'Changelog' });
    expect(changelog).toHaveAttribute('href', '/components/button/changelog');
    expect(changelog).not.toHaveAttribute('target');
  });

  it('leaves the Radix link off a package that does not wrap Radix', async () => {
    await renderApp('/components/icons');
    const links = within(screen.getByRole('navigation', { name: 'Icon links' }));

    expect(links.getByRole('link', { name: 'View source' })).toBeInTheDocument();
    expect(links.queryByRole('link', { name: /^Radix/ })).not.toBeInTheDocument();
  });

  it('rewrites a README cross-link to a sibling package as an internal route', async () => {
    await renderApp('/components/button');

    // The README says this in the only way that works on npm and GitHub: the
    // sibling's URL there. Here, that page is one route away.
    const sibling = await screen.findByRole(
      'link',
      { name: '@pineappleui/icon-button' },
      SUSPENSE_TIMEOUT,
    );
    expect(sibling).toHaveAttribute('href', '/components/icon-button');
    expect(sibling).not.toHaveAttribute('target');

    // Everything else in the same README is genuinely elsewhere and stays a
    // new tab — including the repo root, which is not a package page.
    const [radix] = screen.getAllByRole('link', { name: '@radix-ui/themes' });
    expect(radix).toHaveAttribute('href', 'https://www.radix-ui.com/themes');
    expect(radix).toHaveAttribute('target', '_blank');
    const [repo] = screen.getAllByRole('link', { name: '@pineappleui' });
    expect(repo).toHaveAttribute('href', 'https://github.com/davidz-repo/pineapple-design-systems');
  });
});

describe('tabs', () => {
  it('renders each tab as a real link, carrying the class its pending style needs', async () => {
    await renderApp('/components/button');
    const tab = within(await findTabStrip()).getByRole('link', { name: /Playground/ });

    // A link, not a button with a click handler: a tab is an address, and a
    // reader may want to copy it or open it in a new tab.
    expect(tab).toHaveAttribute('href', '/components/button/playground');
    // The pending style hangs off this class, and it only reaches the anchor
    // because Radix's `asChild` slot merges className. If that merge ever
    // stopped, the tabs would keep working and silently stop showing that they
    // are loading — the failure nothing else would report.
    expect(tab).toHaveClass('site-tab-link');
  });

  it('calls the changelog tab Changelog, and routes it there', async () => {
    await renderApp('/components/button/changelog');
    const tabs = within(await findTabStrip());

    expect(tabs.getByRole('link', { name: /Changelog/ })).toBeInTheDocument();
    expect(tabs.queryByRole('link', { name: /Versions/ })).not.toBeInTheDocument();
    // The CHANGELOG's own version headings are the content of the tab.
    expect(await screen.findByRole('heading', { name: '0.1.0' }, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
  });

  it('answers an unknown tab inside the page, not with a full-page 404', async () => {
    await renderApp('/components/button/nope');

    expect(await screen.findByRole('heading', { name: 'No such tab' }, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
    expect(screen.getByText(/Button has no “nope” tab/)).toBeInTheDocument();
    expect(screen.getByText(/Overview, Playground, Changelog/)).toBeInTheDocument();
    // Scoped: the package is still on the screen, tabs included.
    expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeInTheDocument();
    expect(await findTabStrip()).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument();
  });

  it('lists only the tabs the package has when one it lacks is asked for', async () => {
    // tokens exports no stories, so it has no playground — the commonest way
    // to land on a tab that does not exist, and not a typo at all.
    await renderApp('/components/tokens/playground');

    expect(await screen.findByRole('heading', { name: 'No such tab' }, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
    expect(screen.getByText(/Tokens has no “playground” tab/)).toBeInTheDocument();
    expect(screen.getByText(/Overview, Changelog/)).toBeInTheDocument();
  });

  it('announces the tab it switched to, and says nothing on arrival', async () => {
    await renderApp('/components/button');
    // Arriving on a tab is not switching to it; the document title has already
    // said where the reader is.
    expect(screen.queryByText('Button overview')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(await findTabStrip()).getByRole('link', { name: /Changelog/ }));
    });

    const announcement = await screen.findByText('Button changelog', undefined, SUSPENSE_TIMEOUT);
    // In a region a screen reader is watching, not just somewhere on the page.
    expect(announcement.closest('[aria-live]')).not.toBeNull();
  });
});
