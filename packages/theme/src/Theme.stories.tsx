import { Button, Text } from '@radix-ui/themes';

import { STORAGE_KEY } from './preferences';

// These stories mount nothing themselves: the gallery's global decorator
// (ThemePreferencesProvider + DesignSystemProvider, in
// apps/gallery/.ladle/components.tsx) is the tree under test, and every other
// package's stories render inside the same one. What they show is what that
// tree contributes — the accent, the appearance and the font.
//
// One file, so the gallery lists these under `theme` alongside every other
// package. Ladle names a story group after the file it came from, and two
// files here would read as two unattributed groups.

// The smallest thing the gallery can render: a line of text picking up the
// theme's font and colour. Unstyled output here means the decorator or
// `@pineappleui/theme/styles.css` is missing, not that Radix's Text is broken.
export function HelloWorld() {
  return (
    <div style={{ padding: 16 }}>
      <Text>Design system is alive.</Text>
    </div>
  );
}

export function ThemedTextAndButton() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text size="5" weight="bold">
        Theme provider smoke test
      </Text>
      <Text size="3">
        Radix accent color and appearance (light/dark) come from ThemePreferencesProvider via
        DesignSystemProvider, which persists both under one localStorage key (
        {STORAGE_KEY}
        ). Whether anything on screen WRITES it depends on where you are reading this: the
        gallery mounts an accent picker top-right, and the docs site does not — it ships one
        palette and pins the accent on both painting surfaces, so there the stored value is
        read and overridden rather than followed. Either way an edit made by hand in DevTools
        → Application sticks. Appearance does not: in the gallery Ladle's toolbar owns it, and
        the decorator's bridge writes the toolbar's value back over the stored one at mount.
      </Text>
      <Button>Accent-colored button</Button>
    </div>
  );
}
