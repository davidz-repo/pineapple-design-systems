import { ACCENT_COLORS } from '@pineappleui/tokens';
import { getMatchingGrayColor } from '@radix-ui/themes/helpers';

// Returns the first-paint script body as a string, parameterized by the
// localStorage key. Consumers inline it in <script>...</script> in their HTML
// head BEFORE any stylesheet or React module loads, so the page paints the
// stored theme instead of painting the default and snapping to it.
//
// The snippet mirrors ThemePreferencesProvider's storage schema +
// DesignSystemProvider's Radix <Theme> attribute output. Both surfaces MUST
// stay in sync; changing one requires changing the other.
//
// The GENERATED script cannot import anything — it runs before any module
// loads. This generator is an ordinary module and can, so both lists below are
// serialized from their real source rather than hand-typed:
//
//   - the accent list comes from @pineappleui/tokens, the package that owns it
//   - the accent -> gray map comes from Radix's own `getMatchingGrayColor`,
//     which is exactly what <Theme> falls back to when DesignSystemProvider
//     passes it no `grayColor`
//
// A hand-typed copy of either is what shipped `bronze` as a real accent
// everywhere except at first paint; `scripts/check-token-drift.mjs` fails the
// build on one now, and adding an accent needs no edit here at all.
//
// `getFoucScript.test.ts` still diffs the emitted list against the export and
// the FULL set of data-* attributes this script writes against the ones
// DesignSystemProvider actually renders, so a new attribute on either surface
// fails without anyone remembering to assert it. Nothing here needs an
// allowlist kept up to date — add the attribute to both surfaces.

interface GetFoucScriptOptions {
  storageKey: string;
}

// Accent applied when storage is empty or holds an unknown accent. Must match
// ThemePreferencesProvider's DEFAULT_PREFERENCES.accentColor — one literal, in
// two files, with a test that fails when they disagree.
const DEFAULT_ACCENT = 'bronze';

// Radix derives the gray scale from the accent, and <Theme> here is never given
// a `grayColor`, so the same derivation is what first paint has to reproduce.
const GRAY_BY_ACCENT: Record<string, string> = Object.fromEntries(
  ACCENT_COLORS.map(accentColor => [accentColor, getMatchingGrayColor(accentColor)]),
);

export function getFoucScript({ storageKey }: GetFoucScriptOptions): string {
  return `(function () {
  var ACCENT_COLORS = ${JSON.stringify([...ACCENT_COLORS])};
  var GRAY_BY_ACCENT = ${JSON.stringify(GRAY_BY_ACCENT)};
  var prefs = {};
  try {
    var raw = localStorage.getItem(${JSON.stringify(storageKey)});
    if (raw) {
      prefs = JSON.parse(raw) || {};
    }
  } catch (e) {
    prefs = {};
  }
  var storedAppearance = prefs.appearance;
  if (storedAppearance !== 'light' && storedAppearance !== 'dark' && storedAppearance !== 'system') {
    storedAppearance = 'system';
  }
  var appearance;
  if (storedAppearance === 'system') {
    var mq = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    appearance = mq && mq.matches ? 'dark' : 'light';
  } else {
    appearance = storedAppearance;
  }
  var accent = ACCENT_COLORS.indexOf(prefs.accentColor) >= 0
    ? prefs.accentColor
    : ${JSON.stringify(DEFAULT_ACCENT)};
  var gray = GRAY_BY_ACCENT[accent] || ${JSON.stringify(GRAY_BY_ACCENT[DEFAULT_ACCENT])};
  var el = document.getElementById('root');
  if (!el) return;
  el.className = 'radix-themes ' + appearance;
  el.setAttribute('data-is-root-theme', 'true');
  el.setAttribute('data-accent-color', accent);
  el.setAttribute('data-gray-color', gray);
  el.setAttribute('data-has-background', 'true');
  el.setAttribute('data-panel-background', 'translucent');
  el.setAttribute('data-radius', 'large');
  el.setAttribute('data-scaling', '100%');
})();`;
}
