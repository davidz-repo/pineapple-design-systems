import { useEffect } from 'react';

import { ThemeState } from '@ladle/react';
import {
  DesignSystemProvider,
  ThemePreferencesProvider,
  useThemePreferences,
} from '@pineappleui/theme';
import { ACCENT_COLORS } from '@pineappleui/tokens';

import type { GlobalProvider } from '@ladle/react';
import type { AccentColor, AppearanceSetting } from '@pineappleui/tokens';
import '@pineappleui/theme/styles.css';

// Every story in this repo assumes Radix's <Theme> is in scope — the wrappers
// are pass-throughs whose classes only resolve inside it. `@pineappleui/theme`
// is what mounts it now, and its stylesheet is the only one imported here:
// `styles.css` pulls in Radix's own, so a second `@radix-ui/themes/styles.css`
// import would be a duplicate rather than a requirement.
//
// This decorator mounts NO <Theme> of its own, deliberately. A Radix <Theme>
// nested inside another one is legal and half-applies — the inner one inherits
// whatever the outer set for anything it does not itself specify — so appearance
// and accent stop agreeing in ways that read as a theme bug rather than as two
// providers. What is left here is the two knobs Ladle exposes, wired to the
// package's own preference state: the appearance toolbar, and an accent picker.

// Ladle's built-in appearance toolbar (the bulb in the top bar) writes
// globalState.theme, which arrives as a prop on the global provider. Every value
// it can hold has a preference equivalent, `Auto` included: resolving "follow
// the OS" is DesignSystemProvider's job, not this file's.
const APPEARANCE_BY_LADLE_THEME: Record<ThemeState, AppearanceSetting> = {
  [ThemeState.Light]: 'light',
  [ThemeState.Dark]: 'dark',
  [ThemeState.Auto]: 'system',
};

// The toolbar is the source of truth for appearance in the gallery, and the
// theme package's preference record is what every story reads. This copies one
// into the other.
//
// The effect depends on everything it uses, `setAppearance` included, which
// ThemePreferencesProvider re-creates on every render — so the effect re-runs on
// every render, and the equality check is what makes that harmless: it writes
// only when the two disagree, and after one write they agree. (Dropping the
// dependency instead, with a ref or a lint disable, buys nothing and hides which
// values the effect actually reads.)
function AppearanceBridge({ ladleTheme }: { ladleTheme: ThemeState }) {
  const { appearance, setAppearance } = useThemePreferences();
  const toolbarAppearance = APPEARANCE_BY_LADLE_THEME[ladleTheme];

  useEffect(() => {
    if (toolbarAppearance !== appearance) {
      setAppearance(toolbarAppearance);
    }
  }, [toolbarAppearance, appearance, setAppearance]);

  return null;
}

// Ladle 5 has no API for adding a control to its own toolbar, so the accent
// picker rides along inside the story frame, pinned to the top-right. The
// swatch is `var(--accent-9)` — Radix's primary accent step — so it repaints the
// moment the theme's accent changes, which is the feedback that a click landed.
//
// The options are ACCENT_COLORS spread, never a hand-written list: a copy of
// that list is what shipped a picker missing `bronze` upstream, and
// scripts/check-token-drift.mjs fails this file if one reappears. The selected
// value is the theme package's own preference — there is no local copy of it
// here to keep in sync, and it persists across reloads because the package
// stores it.
function AccentPicker() {
  const { accentColor, setAccentColor } = useThemePreferences();

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid var(--gray-a5)',
        background: 'var(--color-panel-solid)',
        color: 'var(--gray-12)',
        font: '12px/1.2 system-ui, sans-serif',
        boxShadow: '0 2px 6px var(--black-a5)',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--accent-9)',
          boxShadow: '0 0 0 1px var(--accent-a8)',
        }}
      />
      <label htmlFor="gallery-accent" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Accent:
        <select
          id="gallery-accent"
          value={accentColor}
          onChange={event => setAccentColor(event.target.value as AccentColor)}
          style={{ font: 'inherit', padding: '2px 4px' }}
        >
          {ACCENT_COLORS.map(accent => (
            <option key={accent} value={accent}>{accent}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// `minHeight: 100vh` makes Radix's `--color-background` paint the whole story
// frame rather than just the bounding box of the story's own content. Without
// it, switching to dark recolours the story and leaves the rest of the iframe
// white, which reads as "dark mode is broken". It sits on a div INSIDE the
// providers now: <Theme> belongs to DesignSystemProvider, which takes no style.
export const Provider: GlobalProvider = ({ globalState, children }) => (
  <ThemePreferencesProvider>
    <DesignSystemProvider>
      <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
        <AppearanceBridge ladleTheme={globalState.theme} />
        <AccentPicker />
        {children}
      </div>
    </DesignSystemProvider>
  </ThemePreferencesProvider>
);
