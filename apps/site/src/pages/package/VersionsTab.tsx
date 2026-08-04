import { use } from 'react';

import { Text } from '@pineappleui/text';

import { MarkdownView } from '../../components/MarkdownView';
import { changelogFor } from '../../content';

// The changesets-generated CHANGELOG.md, verbatim. Its `# @pineappleui/x`
// title duplicates the page header, so it is stripped; the `## 0.1.0`
// version headings are the content.
export function VersionsTab({ slug }: { slug: string }) {
  const changelog = use(changelogFor(slug));
  if (changelog === null) {
    return (
      <Text as="p" size="3" color="gray">
        No changelog yet — this package has not shipped a release.
      </Text>
    );
  }
  return <MarkdownView markdown={changelog} stripLeadingH1 />;
}
