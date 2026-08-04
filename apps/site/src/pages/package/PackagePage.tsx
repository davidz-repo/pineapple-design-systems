import { Suspense, use } from 'react';

import { Badge } from '@pineappleui/badge';
import { Heading } from '@pineappleui/heading';

import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { TabNav } from '@radix-ui/themes';
import { Link, Route, Routes, useParams } from 'react-router';

import { CodeBlock } from '../../components/CodeBlock';
import { forSlug, manifests } from '../../content';
import { bySlug } from '../../registry';
import { isStoryExport, storyModuleFor } from '../../stories';
import { NotFoundPage } from '../NotFoundPage';
import { ExamplesTab } from './ExamplesTab';
import { OverviewTab } from './OverviewTab';
import { PlaygroundTab } from './PlaygroundTab';
import { VersionsTab } from './VersionsTab';

import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

interface TabDef {
  segment: string;
  label: string;
}

// The tab strip depends on what the story module actually exports (some
// packages have no stories, theme has stories but no Playground), so the
// whole content area waits on the module under one Suspense boundary.
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

  const tabs: TabDef[] = [
    { segment: '', label: 'Overview' },
    ...(examples.length > 0 ? [{ segment: 'examples', label: 'Examples' }] : []),
    ...(playground !== undefined ? [{ segment: 'playground', label: 'Playground' }] : []),
    { segment: 'versions', label: 'Versions' },
  ];

  return (
    <Stack gap="4">
      <TabNav.Root>
        {tabs.map(tab => (
          <TabNav.Link key={tab.segment} asChild active={tail === tab.segment}>
            <Link to={`/components/${entry.slug}${tab.segment === '' ? '' : `/${tab.segment}`}`}>
              {tab.label}
            </Link>
          </TabNav.Link>
        ))}
      </TabNav.Root>
      <Routes>
        <Route index element={<OverviewTab slug={entry.slug} />} />
        {examples.length > 0 && (
          <Route
            path="examples"
            element={<ExamplesTab key={entry.slug} examples={examples} />}
          />
        )}
        {playground !== undefined && (
          <Route
            path="playground"
            element={<PlaygroundTab key={entry.slug} story={playground} entry={entry} />}
          />
        )}
        <Route path="versions" element={<VersionsTab slug={entry.slug} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Stack>
  );
}

export function PackagePage() {
  const { slug = '' } = useParams();
  const entry = bySlug.get(slug);
  if (entry === undefined) {
    return <NotFoundPage />;
  }

  const version = forSlug(manifests, slug)?.version;

  return (
    <Stack gap="4">
      <Stack gap="2">
        <Inline gap="3" align="center">
          <Heading as="h1" size="8">{entry.name}</Heading>
          {version !== undefined && <Badge variant="soft" size="2">{`v${version}`}</Badge>}
        </Inline>
        <Text as="p" size="3" color="gray">{entry.blurb}</Text>
        <CodeBlock code={`npm install @pineappleui/${entry.slug}`} />
      </Stack>
      <Suspense fallback={<Text size="2" color="gray">Loading…</Text>}>
        <PackageContent key={slug} entry={entry} />
      </Suspense>
    </Stack>
  );
}
