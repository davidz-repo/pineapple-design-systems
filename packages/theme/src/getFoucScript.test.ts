import type { ReactNode } from 'react';

import { createElement } from 'react';

import { ACCENT_COLORS } from '@pineappleui/tokens';
import { getMatchingGrayColor } from '@radix-ui/themes/helpers';
import { render, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { getFoucScript } from './getFoucScript';
import { DesignSystemProvider } from './providers/DesignSystemProvider';
import { ThemePreferencesProvider, useThemePreferences } from './providers/ThemePreferencesProvider';

const STORAGE_KEY = 'pineappleui.theme.v1';
const FOUC_SCRIPT = getFoucScript({ storageKey: STORAGE_KEY });

// ── Running the boot script the way a browser does ──────────────────────────
//
// The script is a string meant for an inline <script> in <head>, so the only
// faithful way to exercise it is to let jsdom execute it. Two consequences,
// both load-bearing for every helper below:
//
//   1. Globals the script assigns are NOT visible to test code — jsdom runs it
//      against its own window, which is a different object from the `window`
//      vitest exposes here. Assert through the DOM instead.
//   2. `@pineappleui/vitest-preset`'s setup replaces `globalThis.localStorage`
//      with an in-memory shim, but the script reads jsdom's real Storage.
//      Those are two separate stores: `localStorage.setItem(...)` from test
//      code is invisible to the script. Storage must be seeded from inside an
//      injected script, which is what `seedStoredPreferences` does.

function runInDocument(source: string): void {
  const script = document.createElement('script');
  script.textContent = source;
  document.head.appendChild(script);
  script.remove();
}

function seedStoredPreferences(preferences: unknown): void {
  runInDocument(
    `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(preferences))});`,
  );
}

interface BootedTheme {
  accentColor: string | null;
  grayColor: string | null;
}

/** Runs the boot script against a fresh `#root` and reads back what it painted. */
function bootFoucScript(): BootedTheme {
  document.body.innerHTML = '<div id="root"></div>';
  runInDocument(FOUC_SCRIPT);

  const root = document.getElementById('root');
  if (root === null) {
    throw new Error('The boot script removed #root; it should only set attributes on it.');
  }
  if (!root.hasAttribute('data-accent-color')) {
    throw new Error(
      'The boot script did not set data-accent-color on #root, so it never ran. '
      + 'Check that jsdom still executes injected <script> elements.',
    );
  }
  return {
    accentColor: root.getAttribute('data-accent-color'),
    grayColor: root.getAttribute('data-gray-color'),
  };
}

/**
 * The accent the script paints when storage holds nothing it recognises. Read
 * behaviourally rather than parsed, so it stays honest if the fallback moves.
 */
function bootFallbackAccent(): BootedTheme {
  seedStoredPreferences({ appearance: 'system', accentColor: 'definitely-not-an-accent' });
  return bootFoucScript();
}

function providerWrapper({ children }: { children: ReactNode }) {
  return createElement(ThemePreferencesProvider, null, children);
}

// ── Whole-attribute-set drift guard ─────────────────────────────────────────
//
// The boot script and DesignSystemProvider paint the SAME element twice: the
// script at first paint, React on hydration. Any attribute they disagree on is
// a visible snap. Rather than name the attributes (an allowlist someone must
// remember to extend — which is exactly how `data-radius` shipped at `medium`
// while the provider rendered `large`), read the full `data-*` set off both
// surfaces and diff them structurally. A new attribute on either surface
// enters the comparison on its own.

/** Every `data-*` attribute on `el`, as a plain map. Not an allowlist — reads whatever is there. */
function readDataAttributes(el: Element): Record<string, string> {
  return Object.fromEntries(
    [...el.attributes]
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => [attr.name, attr.value]),
  );
}

/** Boots the script against a fresh `#root` and returns every `data-*` it painted. */
function readBootedDataAttributes(): Record<string, string> {
  document.body.innerHTML = '<div id="root"></div>';
  runInDocument(FOUC_SCRIPT);

  const root = document.getElementById('root');
  if (root === null) {
    throw new Error('The boot script removed #root; it should only set attributes on it.');
  }
  const attributes = readDataAttributes(root);
  if (Object.keys(attributes).length === 0) {
    throw new Error(
      'The boot script set no data-* attributes on #root, so it never ran. '
      + 'Check that jsdom still executes injected <script> elements.',
    );
  }
  return attributes;
}

/** Renders the real provider tree and returns every `data-*` Radix's <Theme> put on its root. */
function readRenderedThemeAttributes(): { data: Record<string, string>; className: string } {
  const { container, unmount } = render(
    createElement(ThemePreferencesProvider, null, createElement(DesignSystemProvider, null, null)),
  );
  try {
    const themed = container.querySelector('.radix-themes');
    if (themed === null) {
      throw new Error(
        'DesignSystemProvider rendered no `.radix-themes` element, so there is nothing to '
        + 'compare the boot script against. If Radix stopped emitting that class, update this '
        + 'selector — otherwise nothing is checking for first-paint drift.',
      );
    }
    return { data: readDataAttributes(themed), className: themed.className };
  }
  finally {
    unmount();
  }
}

/** Reads the class the boot script wrote, alongside the `data-*` set. */
function readBootedClassName(): string {
  document.body.innerHTML = '<div id="root"></div>';
  runInDocument(FOUC_SCRIPT);
  return document.getElementById('root')?.className ?? '';
}

/**
 * Seeds BOTH stores with the same preferences. The provider reads the in-memory
 * shim from `@pineappleui/vitest-preset`; the boot script reads jsdom's real
 * Storage. Comparing the two surfaces requires them to agree on the input.
 */
function seedBothStores(preferences: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  seedStoredPreferences(preferences);
}

/** The accent React paints on first render — the value the boot script must pre-empt. */
function readProviderDefaultAccent(): string {
  // Clears the in-memory shim, which is the store `useLocalStorage` reads.
  // Deliberately NOT the same store the boot script uses (see the note above).
  localStorage.clear();
  const { result } = renderHook(() => useThemePreferences(), { wrapper: providerWrapper });
  return result.current.accentColor;
}

beforeEach(() => {
  localStorage.clear();
  runInDocument(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});`);
  document.body.innerHTML = '';
});

describe('getFoucScript', () => {
  // The script runs before any module loads, so the list it carries is a
  // SERIALIZED copy — `${JSON.stringify([...ACCENT_COLORS])}` in the generator,
  // which is an ordinary module and can import. This asserts the copy that
  // reaches the browser is the real list, whichever way the generator got it:
  // it passes today by construction, and it is what fails the day someone
  // "simplifies" the template back to a hand-typed array that then drifts —
  // which is how `bronze` became a real accent everywhere except at first paint.
  //
  // A structural diff, not a behavioural one: an accent missing from the
  // script's list falls back to the DEFAULT accent, so the default itself would
  // round-trip correctly while being entirely absent from the list. Booting each
  // accent cannot see that; reading the literal can.
  it('carries exactly the accent list @pineappleui/tokens exports', () => {
    const literal = /var ACCENT_COLORS = (\[[^\]]*\]);/.exec(FOUC_SCRIPT)?.[1];
    if (literal === undefined) {
      throw new Error(
        'Could not find `var ACCENT_COLORS = [...]` in the boot script. If the script no '
        + 'longer carries an accent list at all this guard is obsolete — delete it. '
        + 'Otherwise fix the pattern, because right now nothing is checking what the '
        + 'browser receives.',
      );
    }

    // The generator serializes with JSON.stringify, so the literal is already
    // double-quoted; a hand-typed one would be single-quoted ES5. Converting
    // covers both, and JSON.parse throws loudly rather than passing silently if
    // the entries are ever something other than plain names.
    const scriptAccentColors: unknown = JSON.parse(literal.replace(/'/g, '"'));

    expect(scriptAccentColors).toEqual([...ACCENT_COLORS]);
  });

  it('applies every accent in ACCENT_COLORS, paired with its Radix gray', () => {
    for (const accentColor of ACCENT_COLORS) {
      seedStoredPreferences({ appearance: 'system', accentColor });

      expect(bootFoucScript()).toEqual({
        accentColor,
        // DesignSystemProvider never passes `grayColor` to Radix's <Theme>, so
        // Radix derives it with getMatchingGrayColor. The script's GRAY_BY_ACCENT
        // map is built from that same function, and this runs the whole path —
        // serialize, ship as a string, execute in jsdom, read the attribute back
        // — which is what a direct comparison of the two maps would not.
        grayColor: getMatchingGrayColor(accentColor),
      });
    }
  });

  it('paints bronze on sand when storage is empty', () => {
    expect(bootFoucScript()).toEqual({ accentColor: 'bronze', grayColor: 'sand' });
  });

  it('paints bronze on sand when the stored accent is not a known accent', () => {
    expect(bootFallbackAccent()).toEqual({ accentColor: 'bronze', grayColor: 'sand' });
  });

  // The bug this pairing already shipped once: the provider's default moved
  // while the script kept falling back to the accent before it, so a first-time
  // visitor got one paint of the wrong accent before React corrected it.
  it('falls back to the same accent ThemePreferencesProvider defaults to', () => {
    expect(bootFallbackAccent().accentColor).toBe(readProviderDefaultAccent());
  });

  // THE other guard, and the one that lets `data-radius` ship at `medium` while
  // DesignSystemProvider rendered `large`: the tests above only ever looked at
  // data-accent-color and data-gray-color, so the four attributes nobody
  // asserted (`data-radius`, `data-scaling`, `data-panel-background`,
  // `data-has-background`) were free to drift. This compares the WHOLE set, so
  // an attribute added to one surface and not the other fails here by itself.
  //
  // Empty storage is the first-time visitor — the person who actually sees the
  // snap, since there is no stored preference for the script to read.
  it('paints exactly the data-* attributes DesignSystemProvider renders, on empty storage', () => {
    expect(
      readBootedDataAttributes(),
      'The boot script and DesignSystemProvider disagree on the attributes below. '
      + 'First paint uses the script\'s value, then hydration snaps to the provider\'s. '
      + 'Received = getFoucScript.ts, expected = <Theme> in DesignSystemProvider.tsx. '
      + 'Fix whichever surface is wrong and keep both in sync.',
    ).toEqual(readRenderedThemeAttributes().data);
  });

  it('paints exactly the data-* attributes DesignSystemProvider renders, for every accent', () => {
    for (const accentColor of ACCENT_COLORS) {
      seedBothStores({ appearance: 'system', accentColor });

      expect(
        readBootedDataAttributes(),
        `Boot script vs DesignSystemProvider disagree with accentColor="${accentColor}" stored.`,
      ).toEqual(readRenderedThemeAttributes().data);
    }
  });

  // The class carries the appearance ("radix-themes light" / "... dark"), which
  // is the same first-paint contract as the data-* attributes above and would
  // otherwise be the one part of the element still unguarded.
  it('paints the same class DesignSystemProvider renders', () => {
    expect(readBootedClassName()).toBe(readRenderedThemeAttributes().className);
  });
});
