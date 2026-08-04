import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Route, Routes, useHref } from 'react-router';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { GettingStartedPage } from './pages/GettingStartedPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PackagePage } from './pages/package/PackagePage';

// The last resort, outside the shell rather than inside it: what this catches
// is whatever the narrower boundaries did not, and the shell — header, sidebar,
// footer — is one of the things that could be it.
//
// The way out is a full document load, not a `<Link>`. Routing away leaves this
// boundary mounted with the same caught error, so the fallback would replace
// the page it navigated to; an ordinary anchor discards the running app. It goes
// through `useHref` so the address keeps the basename that makes it resolve.
function AppCrash({ error, retry }: { error: Error; retry: () => void }) {
  const home = useHref('/');
  return (
    <Stack gap="3" align="start" p="6">
      <Heading as="h1" size="7">Something went wrong</Heading>
      <Text as="p" size="3">
        This page stopped rendering. Trying again is worth a shot — if it keeps
        happening, reloading the site clears whatever state caused it.
      </Text>
      <Text as="p" size="2" color="gray">{error.message}</Text>
      <Inline gap="3" align="center">
        <Button size="2" variant="solid" onClick={retry}>Try again</Button>
        <Button size="2" variant="soft" asChild>
          <a href={home}>Reload the site</a>
        </Button>
      </Inline>
    </Stack>
  );
}

export function App() {
  return (
    <ErrorBoundary fallback={(error, retry) => <AppCrash error={error} retry={retry} />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="getting-started" element={<GettingStartedPage />} />
          <Route path="components/:slug/*" element={<PackagePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
