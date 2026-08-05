import { Heading } from '@pineappleui/heading';

import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack gap="3">
      <Heading as="h1" size="8">Page not found</Heading>
      <Text as="p" size="3">
        Nothing lives at this address. Head back to the
        {' '}
        {/* Classed, because an unclassed <Link> matches none of this site's
            link rules and falls all the way through to the UA's #0000EE with
            its own underline — which on a page whose palette is green and
            amber is the loudest thing on the site, and is wrong on any
            canvas. This is prose, so it takes the prose link treatment. */}
        <Link to="/" className="site-prose-link">introduction</Link>
        .
      </Text>
    </Stack>
  );
}
