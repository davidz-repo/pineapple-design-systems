import { Heading } from '@pineappleui/heading';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { useParams } from 'react-router';

import type { PackageTab } from '../../packageTabs';
import type { RegistryEntry } from '../../registry';

// `/components/button/nope`, and the commoner case that is not a typo at all:
// `/components/tokens/playground`, a tab that exists on most packages and not
// on this one, because tokens exports no stories.
//
// Both used to render the site's 404 page, which replaced the package — its
// header, its tabs, its README — with "Nothing lives at this address". That is
// true of the address and useless about the situation: the reader is one click
// from what they wanted, and the click is already on the screen. So the message
// stays inside the page, under the tab strip it is telling you to use.
//
// The document title still reads "Page not found": the address genuinely names
// no page, and a bookmark or a history entry that claimed otherwise would be
// the lie. What changed is the recovery, not the fact.
export function NoSuchTab({
  entry,
  tabs,
}: {
  entry: RegistryEntry;
  tabs: readonly PackageTab[];
}) {
  const { '*': tail = '' } = useParams();
  const labels = tabs.map(tab => tab.label).join(', ');

  return (
    <Stack gap="2">
      <Heading as="h2" size="4">No such tab</Heading>
      <Text as="p" size="3" color="gray">
        {`${entry.name} has no “${tail}” tab. Its tabs are: ${labels}.`}
      </Text>
    </Stack>
  );
}
