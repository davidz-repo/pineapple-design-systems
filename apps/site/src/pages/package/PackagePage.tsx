import { Suspense, use, useState } from 'react';

import { Badge } from '@pineappleui/badge';
import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';

import { Inline } from '@pineappleui/inline';
import { LiveRegion } from '@pineappleui/live-region';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { TabNav } from '@radix-ui/themes';
import { Route, Routes, useHref, useParams } from 'react-router';

import { CodeBlock } from '../../components/CodeBlock';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { forSlug, manifests } from '../../content';
import { PACKAGE_TABS, tabPath } from '../../packageTabs';
import { bySlug } from '../../registry';
import { isStoryExport, storyModuleFor } from '../../stories';
import { NotFoundPage } from '../NotFoundPage';
import { ChangelogTab } from './ChangelogTab';
import { NoSuchTab } from './NoSuchTab';
import { OverviewTab } from './OverviewTab';
import { PackageLinks } from './PackageLinks';
import { PlaygroundTab } from './PlaygroundTab';
import { TabLink } from './TabLink';
import { PackageTabsSkeleton, TabSkeleton } from './TabSkeleton';

import type { PackageTab } from '../../packageTabs';
import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

// Which tabs a package HAS depends on what its story module exports (tokens has
// no stories at all, theme has stories but no Playground), so the strip waits on
// that import — but only that one. Everything a tab's own content waits on
// (README, CHANGELOG) sits under a second boundary INSIDE the strip, so
// switching tabs never takes the tabs off the screen.
function PackageContent({ entry }: { entry: RegistryEntry }) {
  const storyModule = use(storyModuleFor(entry.slug));
  const { '*': tail = '' } = useParams();

  const examples: Array<[string, StoryExport]> = [];
  for (const [name, value] of Object.entries(storyModule ?? {})) {
    if (name !== 'Playground' && isStoryExport(value)) {
      examples.push([name, value]);
    }
  }
  const playground = storyModule !== null && isStoryExport(storyModule.Playground)
    ? storyModule.Playground
    : undefined;

  const tabs = PACKAGE_TABS.filter(
    tab => tab.segment !== 'playground' || playground !== undefined,
  );

  return (
    <Stack gap="4">
      {/* The strip's own box, and the one that sticks (site.css): the merged
          Overview runs about four screens, and a tab row that exists only at
          the top of it is a scroll up to reach and a scroll back to carry on.
          A wrapper rather than a className on TabNav.Root, because Radix puts
          that className on the LIST inside the <nav> — a sticky box there could
          only stick within a container its own height, i.e. not at all.

          The <nav> is named because it is the third on this page (the sidebar
          and the link row are the others) and "Main" — what Radix's
          NavigationMenu labels itself by default — describes none of them. */}
      <div className="package-tabs">
        <TabNav.Root aria-label="Package tabs">
          {tabs.map(tab => (
            <TabLink
              key={tab.segment}
              to={tabPath(entry.slug, tab.segment)}
              isActive={tail === tab.segment}
            >
              {tab.label}
            </TabLink>
          ))}
        </TabNav.Root>
      </div>
      <Suspense fallback={<TabSkeleton />}>
        <Routes>
          <Route index element={<OverviewTab slug={entry.slug} examples={examples} />} />
          {playground !== undefined && (
            <Route
              path="playground"
              element={<PlaygroundTab key={entry.slug} story={playground} entry={entry} />}
            />
          )}
          <Route path="changelog" element={<ChangelogTab slug={entry.slug} />} />
          <Route path="*" element={<NoSuchTab entry={entry} tabs={tabs} />} />
        </Routes>
      </Suspense>
      <TabAnnouncement entry={entry} tabs={tabs} tail={tail} />
    </Stack>
  );
}

// Switching tabs replaces the page under a reader without moving their focus:
// nothing is announced, and the shell's own route-change handling deliberately
// treats the tabs of a package as one page, so it stays quiet there too. This is
// the piece that speaks — the same words the document title uses, minus the site
// name, because "Button changelog" is what just happened.
//
// The region is mounted for the life of the package page and only its children
// change, which is LiveRegion's contract. The announcement is derived during
// render (React's "adjust state when something changes" pattern, the same one
// the shell's nav panel uses), not in an effect: an effect would announce after
// the tab had already painted, and it would have to remember whether it had run
// to stay quiet on arrival. Here the initial state IS the arrival, so a reader
// who lands on a tab hears nothing — the document title has already said where
// they are.
function TabAnnouncement({
  entry,
  tabs,
  tail,
}: {
  entry: RegistryEntry;
  tabs: readonly PackageTab[];
  tail: string;
}) {
  const [announced, setAnnounced] = useState(() => ({ segment: tail, text: '' }));

  if (announced.segment !== tail) {
    const label = tabs.find(tab => tab.segment === tail)?.label;
    setAnnounced({
      segment: tail,
      text: label === undefined
        ? `${entry.name} has no “${tail}” tab`
        : `${entry.name} ${label.toLowerCase()}`,
    });
  }

  return <LiveRegion className="site-visually-hidden">{announced.text}</LiveRegion>;
}

export function PackagePage() {
  const { slug = '' } = useParams();
  // Called before the early return can be reached, because hooks are: the
  // address of the site's own root, for the fallback's way out.
  const home = useHref('/');
  const entry = bySlug.get(slug);
  if (entry === undefined) {
    return <NotFoundPage />;
  }

  // The manifest, not the slug: the install command is the one address on this
  // page a reader copies and RUNS, and `@pineappleui/${slug}` was the only one
  // the site made up rather than read. They agree for every package today, and
  // the day one is published under a different name the invented one would be
  // a command that fails, on a page that looks right.
  const manifest = forSlug(manifests, slug);

  return (
    <Stack gap="4">
      <Stack gap="2">
        <Inline gap="3" align="center">
          <Heading as="h1" size="8">{entry.name}</Heading>
          {manifest !== undefined && (
            <Badge variant="soft" size="2">{`v${manifest.version}`}</Badge>
          )}
        </Inline>
        <Text as="p" size="3" color="gray">{entry.blurb}</Text>
        <PackageLinks entry={entry} />
        {manifest !== undefined && (
          <CodeBlock code={`npm install ${manifest.name}`} language="bash" />
        )}
      </Stack>
      {/* Keyed by slug, so walking to another package is a fresh boundary and a
          failure cannot follow the reader around the site. The header above is
          outside it on purpose: the package still has a name and a version when
          its docs will not draw. */}
      {/* The two actions are the app-root fallback's (App.tsx), for the reason
          that one has two: retrying re-runs the same render, so a failure that
          is deterministic — a story that throws on every render — is a button
          that visibly does nothing, and a reader who has pressed it twice needs
          the other way out. That one is a real document load, which discards
          every cache and every piece of state this app is holding. */}
      <ErrorBoundary
        key={slug}
        fallback={(error, retry) => (
          <Stack gap="2" align="start">
            {/* Names the surface that failed, not the failure: this boundary
                covers one package's docs, and the rest of the site — the
                header, the sidebar, this package's own name and version — is
                still on the screen around it. */}
            <Heading as="h2" size="4">{`${entry.name}'s docs failed to render`}</Heading>
            <Text as="p" size="3" color="gray">
              {`Something in ${entry.name}'s examples, README or changelog stopped the page. Trying again is worth a shot — if it keeps happening, reloading the site clears whatever state caused it.`}
            </Text>
            <Text as="p" size="2" color="gray">{error.message}</Text>
            <Inline gap="3" align="center">
              <Button size="2" variant="solid" onClick={retry}>Try again</Button>
              <Button size="2" variant="soft" asChild>
                <a href={home}>Reload the site</a>
              </Button>
            </Inline>
          </Stack>
        )}
      >
        <Suspense fallback={<PackageTabsSkeleton />}>
          <PackageContent entry={entry} />
        </Suspense>
      </ErrorBoundary>
    </Stack>
  );
}
