import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';

import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Link } from 'react-router';

import { CodeBlock } from '../components/CodeBlock';

const INSTALL = `npm install @pineappleui/theme @pineappleui/button @pineappleui/inline @pineappleui/stack`;

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

// Uses only packages the install line above installs, so a reader who
// followed this page can paste it and see something render. A bar is a row,
// so it is an Inline — the prose underneath is where Stack gets taught,
// rather than the example being one shape and its caption another.
const FIRST_COMPONENT = `import { Button } from '@pineappleui/button';
import { Inline } from '@pineappleui/inline';

export function SaveBar({ onSave, onDiscard }) {
  return (
    <Inline gap="3" align="center">
      <Button onClick={onSave}>Save changes</Button>
      <Button variant="soft" color="gray" onClick={onDiscard}>
        Discard
      </Button>
    </Inline>
  );
}`;

const FOUC = `import { getFoucScript } from '@pineappleui/theme';

// Inline the returned string in a <script> AFTER your root element so the
// stored appearance and accent paint before React hydrates — no flash.
const firstPaint = getFoucScript();`;

// Quoted from apps/site/vite.config.ts, which is what actually builds this
// site. Keep the two in step when either changes — a worked example that no
// longer matches the source is worse than the prose it replaced.
const FOUC_PLUGIN = `// vite.config.ts
import type { Plugin } from 'vite';

function foucScriptPlugin(): Plugin {
  return {
    name: 'pineapple-fouc-script',
    async transformIndexHtml() {
      const { getFoucScript } = await import('@pineappleui/theme');
      return [{ tag: 'script', children: getFoucScript(), injectTo: 'body' }];
    },
  };
}`;

const NEXT_STEPS: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/components/button/playground', label: 'Button playground' },
  { to: '/components/stack/playground', label: 'Stack playground' },
  { to: '/components/theme', label: 'Theme package docs' },
];

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
        <CodeBlock code={INSTALL} language="bash" />
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
        <CodeBlock code={PROVIDERS} language="tsx" />
      </Stack>

      <Stack gap="3">
        <Heading as="h2" size="5">Your first component</Heading>
        <Text as="p" size="3">
          Components are presentational shells — props in, callbacks out. They
          hold no state of their own and need no configuration; render them
          anywhere inside the providers.
        </Text>
        <CodeBlock code={FIRST_COMPONENT} language="tsx" />
        <Text as="p" size="3">
          <code>Inline</code>
          {' '}
          is the row and
          {' '}
          <code>Stack</code>
          {' '}
          is the column: one flex primitive each, with the axis fixed so the
          name always matches the layout. Swap one for the other here and the
          same two buttons run down the page instead — a column stretches its
          children to the full width, so pass
          {' '}
          <code>align=&quot;start&quot;</code>
          {' '}
          to keep them at their natural size. Both take
          {' '}
          <code>gap</code>
          {' '}
          as a step on the space scale, never a CSS length.
        </Text>
      </Stack>

      <Stack gap="3">
        <Heading as="h2" size="5">First paint</Heading>
        <Text as="p" size="3">
          Preferences persist per browser. To avoid a flash of the default
          theme on reload, inline the first-paint script — this site does
          exactly that at build time.
        </Text>
        <CodeBlock code={FOUC} language="ts" />
        <Text as="p" size="3">
          Here is how this site inlines it, from its own Vite config. The
          {' '}
          <code>injectTo: &apos;body&apos;</code>
          {' '}
          is load-bearing: the script paints
          {' '}
          <code>#root</code>
          {' '}
          and returns silently when that element has not been parsed yet, so
          injecting into the head would be a permanent no-op.
        </Text>
        <CodeBlock code={FOUC_PLUGIN} language="ts" />
      </Stack>

      <Stack gap="3">
        <Heading as="h2" size="5">Next steps</Heading>
        <Text as="p" size="3">
          Every package page carries that package&apos;s own README and its
          changelog, and — where the package has examples — renders them live
          alongside a playground you can drive from its real props.
        </Text>
        <Inline gap="3" align="center">
          {NEXT_STEPS.map(step => (
            <Button key={step.to} asChild variant="soft">
              <Link to={step.to}>{step.label}</Link>
            </Button>
          ))}
        </Inline>
      </Stack>
    </Stack>
  );
}
