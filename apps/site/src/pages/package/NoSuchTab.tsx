import { Fragment } from 'react';

import { Heading } from '@pineappleui/heading';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Link as ThemeLink } from '@radix-ui/themes';
import { Link, useParams } from 'react-router';

import { tabPath } from '../../packageTabs';

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

/**
 * The tab labels as prose — "Overview and Changelog", "Overview, Playground,
 * and Changelog". English, hard-coded, like every other string on this page.
 */
function joinBefore(index: number, count: number): string {
  if (index === 0) {
    return '';
  }
  if (index === count - 1) {
    return count === 2 ? ' and ' : ', and ';
  }
  return ', ';
}

export function NoSuchTab({
  entry,
  tabs,
}: {
  entry: RegistryEntry;
  tabs: readonly PackageTab[];
}) {
  const { '*': tail = '' } = useParams();

  return (
    <Stack gap="2">
      {/* The heading says what happened and the body says what to do about it.
          They used to say the same thing twice — a heading reading "No such
          tab" above a sentence that also said there was no such tab — and the
          way out was a list of names in plain text, which reads as an
          instruction to go and find them. */}
      <Heading as="h2" size="4">{`${entry.name} has no “${tail}” tab`}</Heading>
      <Text as="p" size="3" color="gray">
        Try
        {' '}
        {tabs.map((tab, index) => (
          // Keyed by the segment, which is the tab's identity in the router.
          // Radix's Link (over react-router's, through `asChild`) because these
          // are words in a sentence: it brings the prose link's colour,
          // underline and focus ring, where `.package-link` is chrome padding
          // for a row of controls.
          <Fragment key={tab.segment}>
            {joinBefore(index, tabs.length)}
            <ThemeLink asChild>
              <Link to={tabPath(entry.slug, tab.segment)}>{tab.label}</Link>
            </ThemeLink>
          </Fragment>
        ))}
        .
      </Text>
    </Stack>
  );
}
