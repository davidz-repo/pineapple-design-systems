import { Heading } from '@pineappleui/heading';

import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Link } from 'react-router';

import { CodeBlock } from '../components/CodeBlock';

const INSTALL = `npm install @pineappleui/theme @pineappleui/button @pineappleui/stack`;

const PROVIDERS = `import { DesignSystemProvider, ThemePreferencesProvider } from '@pineappleui/theme';
import '@pineappleui/theme/styles.css';

export function AppRoot({ children }) {
  return (
    <ThemePreferencesProvider>
      <DesignSystemProvider>
        {children}
      </DesignSystemProvider>
    </ThemePreferencesProvider>
  );
}`;

const FOUC = `import { getFoucScript } from '@pineappleui/theme';

// Inline the returned string in a <script> AFTER your root element so the
// stored appearance and accent paint before React hydrates — no flash.
const firstPaint = getFoucScript();`;

export function GettingStartedPage() {
  return (
    <Stack gap="5">
      <Heading as="h1" size="8">Getting started</Heading>

      <Stack gap="3">
        <Heading as="h2" size="5">Install</Heading>
        <Text as="p" size="3">
          Packages are published independently — install the theme plus
          whichever components you use. Radix Themes, React and ReactDOM are
          peers.
        </Text>
        <CodeBlock code={INSTALL} />
      </Stack>

      <Stack gap="3">
        <Heading as="h2" size="5">Theming</Heading>
        <Text as="p" size="3">
          Import the theme stylesheet once — it pulls in Radix&apos;s CSS and the
          Geist font itself — and mount both providers, preferences outermost.
          {' '}
          <code>DesignSystemProvider</code>
          {' '}
          owns the single Radix
          {' '}
          <code>&lt;Theme&gt;</code>
          ; never mount another.
        </Text>
        <CodeBlock code={PROVIDERS} />
      </Stack>

      <Stack gap="3">
        <Heading as="h2" size="5">First paint</Heading>
        <Text as="p" size="3">
          Preferences persist per browser. To avoid a flash of the default
          theme on reload, inline the first-paint script — this site does
          exactly that at build time.
        </Text>
        <CodeBlock code={FOUC} />
        <Text as="p" size="3">
          The full contract lives in the
          {' '}
          <Link to="/components/theme">theme package&apos;s docs</Link>
          .
        </Text>
      </Stack>
    </Stack>
  );
}
