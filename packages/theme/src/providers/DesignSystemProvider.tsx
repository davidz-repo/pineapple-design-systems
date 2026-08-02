import type { ReactNode } from 'react';

import { useSyncExternalStore } from 'react';

import { Theme } from '@radix-ui/themes';

import { useThemePreferences } from './ThemePreferencesProvider';

// useSyncExternalStore is the idiomatic React way to subscribe to external
// browser APIs (like matchMedia) without triggering the
// "setState synchronously in effect" lint warning.
// Guard against jsdom (used in tests) where window exists but matchMedia is not implemented.
const mq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function subscribeToOsPreference(onStoreChange: () => void): () => void {
  mq?.addEventListener('change', onStoreChange);
  return () => mq?.removeEventListener('change', onStoreChange);
}

function getOsAppearanceSnapshot(): 'light' | 'dark' {
  return mq?.matches ? 'dark' : 'light';
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const { appearance, accentColor } = useThemePreferences();

  const osAppearance = useSyncExternalStore(
    subscribeToOsPreference,
    getOsAppearanceSnapshot,
    getServerSnapshot,
  );

  const resolvedAppearance: 'light' | 'dark'
    = appearance === 'system' ? osAppearance : appearance;

  return (
    <Theme
      appearance={resolvedAppearance}
      accentColor={accentColor}
      radius="large"
      scaling="100%"
    >
      {children}
    </Theme>
  );
}
