import { ACCENT_COLORS } from '@pineappleui/tokens';
import { getMatchingGrayColor } from '@radix-ui/themes/helpers';

import { DEFAULT_ACCENT, STORAGE_KEY } from './preferences';

// Returns the first-paint script body as a string. Consumers inline it in
// <script>...</script> at the END of their <body>, AFTER the element the
// provider tree mounts into, so the page paints the stored theme instead of
// painting the default and snapping to it. That is still ahead of React — the
// module script that mounts the tree is deferred, so it runs after this one —
// and it is the only placement that does anything at all: see
// DEFAULT_ROOT_ELEMENT_ID below for why an earlier one is a silent no-op.
//
// Both options default, and the defaults are the only values that work unless
// the consumer changes both surfaces: the key is the one
// ThemePreferencesProvider reads, imported from `./preferences` rather than
// asked for, and the element is the one the provider tree mounts into.
// Requiring the caller to pass the key made a matching pair the caller's job to
// get right — and a key that does not match is not an error anywhere: the
// script reads nothing, paints the default, and React snaps to the stored theme
// one frame later, which is the flash this function exists to remove. The
// overrides stay for the consumer whose root is not `#root`, and for the one
// persisting under a key of their own — that consumer sets the SAME string
// here and on `ThemePreferencesProvider`'s `storageKey` prop, with
// `THEME_STORAGE_KEY` exported as what they are replacing.
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
  /**
   * Defaults to the key `ThemePreferencesProvider` persists under
   * (`THEME_STORAGE_KEY`). Overriding it means overriding the provider's
   * `storageKey` prop with the same string.
   */
  storageKey?: string;
  /** Defaults to `root`, the element the provider tree is mounted into. */
  rootElementId?: string;
}

// The element the script paints. It is `#root` because that is what the
// provider tree renders into and therefore what Radix's <Theme> will claim on
// hydration; painting anything else is a first paint that hydration does not
// agree with. Absent, the script returns silently rather than throwing —
// throwing inside an inline script would take the rest of the page's inline
// scripts down with it. That silence is what makes the placement above
// load-bearing: run this before its mount point is parsed (from <head>, say)
// and it finds nothing, paints nothing, and reports nothing while it does.
const DEFAULT_ROOT_ELEMENT_ID = 'root';

// Radix derives the gray scale from the accent, and <Theme> here is never given
// a `grayColor`, so the same derivation is what first paint has to reproduce.
const GRAY_BY_ACCENT: Record<string, string> = Object.fromEntries(
  ACCENT_COLORS.map(accentColor => [accentColor, getMatchingGrayColor(accentColor)]),
);

/**
 * A value as a JS literal that is safe to nest in an inline `<script>`.
 *
 * The HTML parser does not parse the script body — it scans it for `</script`
 * and ends the element there, whatever the JavaScript meant. So a storage key
 * (or any other interpolated string) containing `</script>` would close the
 * element early and drop the rest of the snippet into the document as markup:
 * a broken first paint at best, and the consumer's own injection at worst,
 * since whatever followed is then parsed as HTML.
 *
 * `<` is the same character to JavaScript and not the same to the parser,
 * so escaping every `<` makes the sequence unreachable without changing what
 * the script sees. Applied to EVERY interpolation rather than to the key alone:
 * an escape that covers the one value someone remembered is the shape of this
 * bug, not the fix for it.
 */
function toInlineSafeLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003C');
}

export function getFoucScript({
  storageKey = STORAGE_KEY,
  rootElementId = DEFAULT_ROOT_ELEMENT_ID,
}: GetFoucScriptOptions = {}): string {
  return `(function () {
  var ACCENT_COLORS = ${toInlineSafeLiteral([...ACCENT_COLORS])};
  var GRAY_BY_ACCENT = ${toInlineSafeLiteral(GRAY_BY_ACCENT)};
  var prefs = {};
  try {
    var raw = localStorage.getItem(${toInlineSafeLiteral(storageKey)});
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
    : ${toInlineSafeLiteral(DEFAULT_ACCENT)};
  var gray = GRAY_BY_ACCENT[accent] || ${toInlineSafeLiteral(GRAY_BY_ACCENT[DEFAULT_ACCENT])};
  var el = document.getElementById(${toInlineSafeLiteral(rootElementId)});
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
