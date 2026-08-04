import type { ReactNode } from 'react';

import { useSyncExternalStore } from 'react';

import { Theme } from '@radix-ui/themes';

import { useThemePreferences } from './ThemePreferencesProvider';

import type { AccentColor } from '@pineappleui/tokens';

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

interface DesignSystemProviderProps {
  children: ReactNode;
  /**
   * Pins the accent, ignoring the stored preference.
   *
   * For the app that ships ONE palette and offers no accent picker. Without it,
   * an app that removes its picker still renders whatever accent its returning
   * visitors happen to have stored — a record they can no longer change, and
   * one that predates the palette the app is now designed around. Changing the
   * default alone does not reach them: a stored accent that is still a valid
   * accent is still honoured, which is the point of storing it.
   *
   * Pass the SAME value to `getFoucScript({ accentColor })`. The two surfaces
   * paint the same element — the script at first paint, this provider on
   * hydration — so a pair that disagrees is one frame of the wrong accent
   * followed by a snap, which is the exact flash the boot script exists to
   * prevent, and nothing reports it.
   *
   * Omit it (the default) to follow the stored preference, which is what an app
   * WITH a picker wants: `setAccentColor` keeps working either way, but under a
   * pin its effect is invisible.
   */
  accentColor?: AccentColor;
}

export function DesignSystemProvider({
  children,
  accentColor: pinnedAccentColor,
}: DesignSystemProviderProps) {
  const { appearance, accentColor: storedAccentColor } = useThemePreferences();
  const accentColor = pinnedAccentColor ?? storedAccentColor;

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
