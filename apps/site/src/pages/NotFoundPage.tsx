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
        <Link to="/">introduction</Link>
        .
      </Text>
    </Stack>
  );
}
