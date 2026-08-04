import { act } from 'react';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  findTabStrip,
  readPackageManifest,
  renderApp,
  silenceCaughtErrors,
  SUSPENSE_TIMEOUT,
} from '../../test-helpers';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// What the package page does with a package, on the real pipeline: the story
// globs, the READMEs and the manifests are all the ones on disk. Three
// packages' story MODULES are stood in for, and each stands in for something
// this environment cannot produce:
//
//   - a story that throws, because no package ships one, and a boundary nobody
//     has seen catch anything is a boundary nobody knows is wired up;
//   - a module whose exports enumerate SORTED, which is what a browser's ES
//     module namespace does and what the ordering exists to undo. vite-node
//     hands a real module's exports back in declaration order, so against the
//     real module the ordering is unobservable and its removal would pass;
//   - a module that fails to load at all, which is what takes out a whole
//     package's docs rather than one canvas.
//
// All keep their real story FILE (`storySourceFor` is untouched), which is
// where the declaration order and the disclosed source come from.

// Hoisted with the modules themselves: `vi.mock`'s factory runs before this
// file's own top-level `const`s, and it reads the slugs.
const {
  BROKEN_SLUG,
  SORTED_SLUG,
  UNLOADABLE_SLUG,
  SLOW_SLUG,
  brokenStories,
  sortedStories,
  unloadableStories,
  slowStories,
} = vi.hoisted(() => {
  function Broken(): string {
    throw new Error('this story is broken');
  }
  function Fine(): string {
    return 'a working example';
  }
  // Card's file declares Variants above Sizes; these are the same two exports
  // in the order a namespace object would list them.
  function Sizes(): string {
    return 'the sizes example';
  }
  function Variants(): string {
    return 'the variants example';
  }
  // `use()` rethrows a rejected promise into the render, which is how a chunk
  // that will not load reaches the package boundary. The bare `.catch` attaches
  // a handler so node does not report the rejection before React asks for it;
  // the promise React gets is still the rejected one.
  const unloadable = Promise.reject(new Error('this package could not be loaded'));
  unloadable.catch(() => {});
  // Stable promises, not fresh ones per call: `use()` needs the same instance
  // across render retries — the same reason content.ts caches its loaders.
  return {
    BROKEN_SLUG: 'badge',
    SORTED_SLUG: 'card',
    UNLOADABLE_SLUG: 'inline',
    SLOW_SLUG: 'text-area',
    brokenStories: Promise.resolve({ Broken, Fine }),
    sortedStories: Promise.resolve({ Sizes, Variants }),
    unloadableStories: unloadable,
    // A chunk still in flight, forever: the cold cache, held still. Anything
    // that has to wait for this never happens in a test.
    slowStories: new Promise<Record<string, unknown>>(() => {}),
  };
});

vi.mock('../../stories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../stories')>();
  const stubbed = new Map<string, Promise<Record<string, unknown>>>([
    [BROKEN_SLUG, brokenStories],
    [SORTED_SLUG, sortedStories],
    [UNLOADABLE_SLUG, unloadableStories],
    [SLOW_SLUG, slowStories],
  ]);
  return {
    ...actual,
    // eslint-disable-next-line ts/promise-function-async -- same rule as the real loader: `async` would mint a fresh promise per call and break `use()` identity
    storyModuleFor: (slug: string) => stubbed.get(slug) ?? actual.storyModuleFor(slug),
  };
});

// The address itself, on screen, for the test that is about the address.
// MemoryRouter keeps no `window.location` to read.
function CurrentPath() {
  const { pathname } = useLocation();
  return <p>{`test-only: at ${pathname}`}</p>;
}

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

  it('shows the examples in the order the story file declares them', async () => {
    await renderApp(`/components/${SORTED_SLUG}`);
    await screen.findByRole('heading', { name: 'Examples' }, SUSPENSE_TIMEOUT);

    // The module hands them over sorted (Sizes, Variants); the file declares
    // Variants first, and the file is what the page shows.
    const examples = screen.getByRole('region', { name: 'Examples' });
    expect(within(examples).getAllByRole('heading', { level: 3 }).map(h => h.textContent))
      .toEqual(['Variants', 'Sizes']);
  });

  it('has one outline: the package, its Examples, its README', async () => {
    await renderApp('/components/button');
    await screen.findByText('What it exports', undefined, SUSPENSE_TIMEOUT);

    // The same shape on every package page, whatever its README is written
    // like — which is what lets a reader move by heading and know where they
    // are. Props joins the h2s when that table lands.
    expect(screen.getAllByRole('heading', { level: 1 }).map(h => h.textContent))
      .toEqual(['Button']);
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent))
      .toEqual(['Examples', 'README']);
    // The README's own `##` sections belong to that h2 rather than standing
    // beside it: demoted, so the outline says whose sections they are.
    expect(screen.getByRole('heading', { name: 'What it exports' }).tagName).toBe('H3');
  });

  it('discloses each example\'s own source on demand', async () => {
    await renderApp('/components/button');

    // One per example, and collapsed: the source is opt-in, and the region it
    // controls is in the document from the start so `aria-controls` names
    // something real.
    const toggles = await screen.findAllByRole(
      'button',
      { name: /^Show code for / },
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

  it('names the example each code control acts on', async () => {
    await renderApp('/components/button');
    await screen.findByRole('heading', { name: 'Examples' }, SUSPENSE_TIMEOUT);

    // A dozen buttons reading "Show code" is a list a screen-reader user
    // cannot choose from. The visible text stays the START of the name, so
    // "click Show code" still works by voice (WCAG 2.5.3).
    const toggle = screen.getByRole('button', { name: 'Show code for Variants' });
    expect(toggle).toHaveTextContent('Show code');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle).toHaveAccessibleName('Hide code for Variants');
    // The fence it revealed carries the same name onto its copy button.
    expect(screen.getByRole('button', { name: 'Copy code for Variants' })).toBeInTheDocument();
    // The fences that are nobody's example — the install command, the README's
    // own — keep the plain label.
    expect(screen.getAllByRole('button', { name: 'Copy code' }).length).toBeGreaterThan(0);
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

  it('names the surface and offers two ways out when a package\'s docs fail', async () => {
    const consoleError = silenceCaughtErrors();
    await renderApp(`/components/${UNLOADABLE_SLUG}`);

    // The heading says WHICH docs failed, because the page around it is fine:
    // the package's own name and version are still above this message.
    expect(await screen.findByRole(
      'heading',
      { name: 'Inline\'s docs failed to render' },
      SUSPENSE_TIMEOUT,
    )).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inline', level: 1 })).toBeInTheDocument();

    // Retry re-runs the same render, so a deterministic failure leaves it a
    // button that does nothing. The second action is a real document load,
    // which is the only thing that clears the state that caused it.
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reload the site' })).toHaveAttribute('href', '/');

    consoleError.mockRestore();
  });

  it('leaves one package\'s failure behind when the reader walks to another', async () => {
    const consoleError = silenceCaughtErrors();
    await renderApp(`/components/${UNLOADABLE_SLUG}`);
    expect(await screen.findByRole(
      'heading',
      { name: /docs failed to render$/ },
      SUSPENSE_TIMEOUT,
    )).toBeInTheDocument();

    // One route serves every package (`components/:slug/*`), so React reuses
    // the boundary element across this navigation and a caught error would
    // still be caught — the reader would arrive at a working package and be
    // told its docs failed. The `key={slug}` remount is the only thing that
    // clears it, and nothing else in the suite would notice its removal.
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Button' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Examples' })).toBeInTheDocument();
    }, SUSPENSE_TIMEOUT);
    expect(screen.queryByRole('heading', { name: /docs failed to render$/ }))
      .not
      .toBeInTheDocument();

    consoleError.mockRestore();
  });
});

describe('package links', () => {
  it('derives the source, npm and Radix links from the package data', async () => {
    await renderApp('/components/button');
    const links = within(screen.getByRole('navigation', { name: 'Button links' }));

    expect(links.getByRole('link', { name: /^View source/ })).toHaveAttribute(
      'href',
      'https://github.com/davidz-repo/pineapple-design-systems/tree/main/packages/button',
    );
    expect(links.getByRole('link', { name: /^npm/ })).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/@pineappleui/button',
    );
    expect(links.getByRole('link', { name: /^Radix Button/ })).toHaveAttribute(
      'href',
      'https://www.radix-ui.com/themes/docs/components/button',
    );
  });

  it('says which links leave the site, in the name a screen reader reads', async () => {
    await renderApp('/components/button');
    const links = within(screen.getByRole('navigation', { name: 'Button links' }));

    // Every link in the row is off-site, and the note is part of the name, so
    // it is announced with the link rather than left to a tab appearing.
    for (const link of links.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
    }
  });

  it('leaves the changelog to its tab instead of linking it twice', async () => {
    await renderApp('/components/button');
    const links = within(screen.getByRole('navigation', { name: 'Button links' }));

    // The row is for what is NOT on this page; the tab strip below carries the
    // changelog, and two controls to one address were two things to weigh.
    expect(links.queryByRole('link', { name: /Changelog/ })).not.toBeInTheDocument();
    expect(within(await findTabStrip()).getByRole('link', { name: /Changelog/ }))
      .toHaveAttribute('href', '/components/button/changelog');
  });

  it('installs the name the package publishes under', async () => {
    await renderApp('/components/icons');

    // Read off the manifest, like the page does — not spelled out here and not
    // built out of the slug. The slug is a route; the install command is run in
    // a terminal, and the two agreeing today is a fact about today.
    const { name } = readPackageManifest('icons');
    const fences = Array.from(document.querySelectorAll('.code-block pre'))
      .map(fence => fence.textContent);
    expect(fences).toContain(`npm install ${name}`);
  });

  it('leaves the Radix link off a package that does not wrap Radix', async () => {
    await renderApp('/components/icons');
    const links = within(screen.getByRole('navigation', { name: 'Icon links' }));

    expect(links.getByRole('link', { name: /^View source/ })).toBeInTheDocument();
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

  it('keeps the strip reachable from anywhere down the page', async () => {
    await renderApp('/components/button');

    // The Overview is examples AND README — several screens — so the strip
    // sticks under the site header instead of living only at the top. jsdom has
    // no layout to measure that with; what a test can hold is that the strip is
    // inside the box the sticky rule addresses. Radix puts a className on
    // TabNav.Root's inner LIST, so the box is a wrapper — and a wrapper is
    // exactly the kind of thing a later edit dissolves without noticing.
    expect((await findTabStrip()).closest('.package-tabs')).not.toBeNull();
  });

  it('calls the changelog tab Changelog, and routes it there', async () => {
    await renderApp('/components/button/changelog');
    const tabs = within(await findTabStrip());

    expect(tabs.getByRole('link', { name: /Changelog/ })).toBeInTheDocument();
    expect(tabs.queryByRole('link', { name: /Versions/ })).not.toBeInTheDocument();
    // The CHANGELOG's own version headings are the content of the tab, at the
    // level the file writes them: here the file IS the page, so nothing demotes
    // them the way the Overview demotes the README's.
    expect(await screen.findByRole('heading', { name: '0.1.0', level: 2 }, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
  });

  it('sends the tab\'s old address to the changelog', async () => {
    await renderApp('/components/button/versions', <CurrentPath />);

    // A navigation, so it is waited for: React Router runs one inside a
    // transition, and the render right after the click is still the old page.
    await waitFor(() => {
      expect(screen.getByText('test-only: at /components/button/changelog')).toBeInTheDocument();
    }, SUSPENSE_TIMEOUT);
    // The address moved AND the tab drew: a redirect that lands on "no such
    // tab" would satisfy half of this.
    expect(await screen.findByRole('heading', { name: '0.1.0', level: 2 }, SUSPENSE_TIMEOUT))
      .toBeInTheDocument();
    expect(screen.queryByText(/has no “versions” tab/)).not.toBeInTheDocument();
  });

  it('redirects without waiting for the package\'s story chunk', async () => {
    // This package's stories never arrive, so anything downstream of that
    // import cannot run: the tab <Routes> live under a Suspense boundary that
    // waits on it, and a redirect declared there would leave a reader on a
    // skeleton — titled "Page not found", since the address names no tab —
    // until the network came back. The redirect is above that boundary.
    await renderApp(`/components/${SLOW_SLUG}/versions`, <CurrentPath />);

    await waitFor(() => {
      expect(screen.getByText(`test-only: at /components/${SLOW_SLUG}/changelog`))
        .toBeInTheDocument();
    }, SUSPENSE_TIMEOUT);
  });

  it('answers an unknown tab inside the page, not with a full-page 404', async () => {
    await renderApp('/components/button/nope');

    // The heading names the miss and the body is the way out — not the same
    // sentence twice, which is what "No such tab" over "has no such tab" was.
    expect(await screen.findByRole(
      'heading',
      { name: 'Button has no “nope” tab' },
      SUSPENSE_TIMEOUT,
    )).toBeInTheDocument();
    const recovery = screen.getByText(/^Try/);
    expect(recovery).toHaveTextContent('Try Overview, Playground, and Changelog.');
    // Every tab it names is a link to that tab, so the recovery is a click
    // rather than a list of names to go and find.
    expect(within(recovery).getByRole('link', { name: 'Playground' }))
      .toHaveAttribute('href', '/components/button/playground');
    expect(within(recovery).getByRole('link', { name: 'Overview' }))
      .toHaveAttribute('href', '/components/button');

    // Scoped: the package is still on the screen, tabs included.
    expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeInTheDocument();
    expect(await findTabStrip()).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument();
  });

  it('lists only the tabs the package has when one it lacks is asked for', async () => {
    // tokens exports no stories, so it has no playground — the commonest way
    // to land on a tab that does not exist, and not a typo at all.
    await renderApp('/components/tokens/playground');

    expect(await screen.findByRole(
      'heading',
      { name: 'Tokens has no “playground” tab' },
      SUSPENSE_TIMEOUT,
    )).toBeInTheDocument();
    // Two tabs take no serial comma; three do.
    expect(screen.getByText(/^Try/)).toHaveTextContent('Try Overview and Changelog.');
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
