import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';

// `act` from @testing-library/react, NOT from react. They are the same function
// wrapped differently: RTL's sets `IS_REACT_ACT_ENVIRONMENT` around the call,
// and React's does not. Nothing in this repo sets that flag globally — the
// vitest preset's setup file does not — so `act` imported from `react` makes
// React log `The current testing environment is not configured to support
// act(...)` for every update it flushes. That is a console error, this suite
// asserts on console errors, and it fired on all thirteen `dropdown-menu`
// stories: the ones with portals and mount effects, which are exactly the ones
// with updates to flush. Diagnosed rather than silenced, because a suite that
// mutes console.error to stay green is a suite that cannot see the warnings it
// exists to catch.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SITE_ACCENT_COLOR, SITE_SCALING } from './site-theme';
import { isStoryExport, resolveStoryArgs, storyModules } from './stories';

import type { StoryExport, StoryModule } from './stories';

// Every story in the repo, actually rendered.
//
// WHY THIS SUITE EXISTS
//
// 52 stories across 15 packages were typechecked by `typecheck`, compiled by
// `gallery:build`, and read as TEXT by the site's "Show code" disclosure — and
// never once mounted by anything that fails. A story is ordinary React: it can
// throw on mount, hand a component a prop that is not in its union, or render
// nothing at all, and every one of those ships. The `dropdown-menu` round found
// this by rendering all twelve of its stories by hand in a review, which is not
// a thing that runs again.
//
// It matters more here than in most repos because the stories ARE the product:
// `ExamplesSection` renders every named export on the package's Overview tab,
// above the README, so a story that throws is a broken docs page, and one that
// renders empty is a heading with nothing under it.
//
// THE SUBJECT LIST IS THE GLOB, NOT A LIST
//
// `storyModules` is the site's own `import.meta.glob`, imported rather than
// re-declared. A new package's stories are covered the day it lands, with
// nobody adding it here — and a package that stops matching that pattern stops
// being rendered by the SITE too, so the two failures are the same failure. The
// counts below are asserted for the same reason `check-props-coverage` prints
// its numbers: a glob that silently matched nothing is the way this suite would
// pass having looked at nothing at all.
//
// WHAT IT DOES NOT DO
//
// It is a smoke suite. It does not assert what a story looks like — that is the
// package's own test, and the gallery. It presses nothing: a story's interactive
// behaviour belongs to the component's suite, which is where `dropdown-menu`'s
// 70 tests are. What it catches is the class the type system cannot: a mount
// that throws, an empty canvas, and the console errors React only ever reports
// at runtime.

/** Slug and export name for a readable test title and failure message. */
interface StoryCase {
  slug: string;
  name: string;
  story: StoryExport;
}

// The glob hands back loaders, so the modules have to be awaited before any
// `it` can be named after what is in them. Vitest collects a file's tests
// synchronously, so this is a top-level await rather than a `beforeAll` — the
// cases have to exist by the time `describe` runs, not by the time it executes.
const cases: StoryCase[] = (
  await Promise.all(
    Object.entries(storyModules).map(async ([filePath, load]) => {
      // `packages/<slug>/src/…` — the same slug the site keys everything else by.
      const slug = filePath.replace(/^.*\/packages\//, '').split('/')[0];
      const module: StoryModule = await load();
      return Object.entries(module)
        // `default` is live-region's `{ title }` metadata object, not a story;
        // `isStoryExport` is the site's own filter, so this suite and the page
        // agree on what counts as a story rather than each deciding.
        .filter(([name, value]) => name !== 'default' && isStoryExport(value))
        .map(([name, story]) => ({ slug, name, story: story as StoryExport }));
    }),
  )
).flat();

/**
 * One story, mounted in the provider tree `main.tsx` mounts.
 *
 * `<Theme>` is not optional scenery: Radix's `useThemeContext()` THROWS outside
 * one — `dropdown-menu`'s `Content` is the member that proves it — so a story
 * rendered bare would fail for a reason that has nothing to do with the story.
 * The accent and scaling are pinned exactly as `test-helpers.tsx` pins them,
 * because an unpinned provider renders every story under whatever the theme
 * store happens to hold.
 *
 * `await act` because a story may suspend or schedule an effect on mount, and
 * React 19 only flushes that inside an async act scope.
 */
async function renderStory({ story: Story }: StoryCase): Promise<HTMLElement> {
  const args = resolveStoryArgs(Story);
  let container!: HTMLElement;
  await act(async () => {
    ({ container } = render(
      <ThemePreferencesProvider>
        <DesignSystemProvider accentColor={SITE_ACCENT_COLOR} scaling={SITE_SCALING}>
          {/* The story gets its own wrapper, and the emptiness check below reads
              THIS rather than the render container. `DesignSystemProvider`
              always renders a `radix-themes` div, so a container is never empty
              and asserting on it passes for a story that returns `null` — which
              is how the first version of this file passed a probe it should have
              failed. Spread rather than passed as one object because Ladle calls
              a story with its args as PROPS. */}
          <div data-story-root><Story {...args} /></div>
        </DesignSystemProvider>
      </ThemePreferencesProvider>,
    ));
  });
  const root = container.querySelector('[data-story-root]');
  if (root === null) {
    throw new Error('the story wrapper did not render, which is a bug in this suite');
  }
  return root as HTMLElement;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('every story in the repo', () => {
  // Guards the glob itself. Without these, deleting the pattern's `packages/*`
  // segment would empty `cases`, `it.each` would register nothing, and the file
  // would report green having mounted nothing — the exact "a suite that matched
  // 0 test files" shape this repo's CI notes are written against.
  it('has stories to render, from more than one package', () => {
    expect(
      Object.keys(storyModules).length,
      'the story glob in stories.ts matched no files, so this suite renders nothing and the '
      + 'site\'s Examples sections are empty too. Check the pattern against packages/*/src/.',
    ).toBeGreaterThan(10);
    expect(cases.length).toBeGreaterThan(40);
    expect(new Set(cases.map(one => one.slug)).size).toBe(Object.keys(storyModules).length);
  });

  it.each(cases.map(one => [`${one.slug}/${one.name}`, one] as const))(
    'renders %s',
    async (label, one) => {
      // React reports a great deal at runtime and nowhere else: a key warning, a
      // controlled-to-uncontrolled switch, invalid DOM nesting, a prop that is
      // not a valid value. None of it throws, so a story can render "fine" and
      // still be wrong in a way only a person watching a console would see —
      // and nobody is watching this console. Captured rather than silenced.
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const root = await renderStory(one);

      expect(
        consoleError.mock.calls.map(args => args.join(' ')).join('\n---\n'),
        `${label} logged a console error while rendering. React reports key warnings, invalid `
        + 'DOM nesting and bad prop values this way and nowhere else, so this is a real defect '
        + 'in the story or in what it renders — not test noise.',
      ).toBe('');

      // A story that mounts and draws nothing is the failure mode a
      // throw-only check misses: on the Overview tab it is a heading with an
      // empty canvas under it, which reads as a broken page rather than as an
      // empty component.
      expect(
        root.textContent === '' && root.querySelector('*') === null,
        `${label} rendered no DOM of its own. It mounted without throwing, so this is a story `
        + 'that returns nothing rather than a story that fails — on the site it is an Examples '
        + 'heading with an empty canvas under it. A story whose whole output is portalled '
        + 'elsewhere would also land here; give it something to anchor in place.',
      ).toBe(false);
    },
  );
});
