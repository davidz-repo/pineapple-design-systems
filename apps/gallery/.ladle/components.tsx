import { useState, useSyncExternalStore } from 'react';

import { ThemeState } from '@ladle/react';
import { ACCENT_COLORS } from '@pineappleui/tokens';
import { Theme } from '@radix-ui/themes';

import type { GlobalProvider } from '@ladle/react';
import type { AccentColor } from '@pineappleui/tokens';
import '@radix-ui/themes/styles.css';

// Every story in this repo assumes Radix's <Theme> is in scope — the wrappers
// are pass-throughs whose classes only resolve inside it. This decorator is the
// only place that mounts it, and it must import Radix's stylesheet itself:
// mounting <Theme> without `@radix-ui/themes/styles.css` renders unstyled
// markup that looks like a broken component rather than a missing import.
//
// @pineappleui/theme (the package that will own appearance + accent state, and
// its own stylesheet) has not been ported yet. Rather than pre-empt its API, the
// two knobs below are held in plain local state and handed straight to Radix
// props. When theme lands, this file swaps to its provider — nothing else moves.

type ResolvedAppearance = 'light' | 'dark';

// Ladle's built-in appearance toolbar (the bulb in the top bar) writes
// globalState.theme, which arrives as a prop on the global provider. Mapping it
// to Radix's `appearance` here is the whole bridge: <Theme> re-renders and every
// story follows. Auto has no Radix equivalent — 'inherit' resolves to light with
// no ancestor Theme to inherit from — so it is resolved against the OS instead.
const APPEARANCE_BY_LADLE_THEME: Record<ThemeState, ResolvedAppearance | null> = {
  [ThemeState.Light]: 'light',
  [ThemeState.Dark]: 'dark',
  [ThemeState.Auto]: null,
};

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** @param onStoreChange re-render callback supplied by useSyncExternalStore */
function subscribeToColorScheme(onStoreChange: () => void) {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
}

function readSystemAppearance(): ResolvedAppearance {
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

interface AccentPickerProps {
  value: AccentColor;
  onChange: (accentColor: AccentColor) => void;
}

// Ladle 5 has no API for adding a control to its own toolbar, so the accent
// picker rides along inside the story frame, pinned to the top-right. The
// swatch is `var(--accent-9)` — Radix's primary accent step — so it repaints the
// moment <Theme accentColor> changes, which is the feedback that a click landed.
//
// The options are ACCENT_COLORS spread, never a hand-written list: a copy of
// that list is what shipped a picker missing `bronze` upstream, and
// scripts/check-token-drift.mjs fails this file if one reappears.
function AccentPicker({ value, onChange }: AccentPickerProps) {
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
          value={value}
          onChange={event => onChange(event.target.value as AccentColor)}
          style={{ font: 'inherit', padding: '2px 4px' }}
        >
          {ACCENT_COLORS.map(accentColor => (
            <option key={accentColor} value={accentColor}>{accentColor}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// `minHeight: 100vh` makes Radix's `--color-background` paint the whole story
// frame rather than just the bounding box of the story's own content. Without
// it, switching to dark recolours the story and leaves the rest of the iframe
// white, which reads as "dark mode is broken".
export const Provider: GlobalProvider = ({ globalState, children }) => {
  const [accentColor, setAccentColor] = useState<AccentColor>(ACCENT_COLORS[0]);
  const systemAppearance = useSyncExternalStore(subscribeToColorScheme, readSystemAppearance);

  return (
    <Theme
      appearance={APPEARANCE_BY_LADLE_THEME[globalState.theme] ?? systemAppearance}
      accentColor={accentColor}
      style={{ minHeight: '100vh' }}
    >
      <AccentPicker value={accentColor} onChange={setAccentColor} />
      {children}
    </Theme>
  );
};
