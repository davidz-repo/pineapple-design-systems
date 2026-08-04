import { Button } from '@pineappleui/button';
import { Inline } from '@pineappleui/inline';

import { useThemePreferences } from '@pineappleui/theme';
import { SegmentedControl } from '@radix-ui/themes';

import type { AppearanceSetting } from '@pineappleui/tokens';

// The header's appearance picker, wired straight to the theme package's own
// preferences hook — the same store the FOUC script reads on the next load.
//
// Appearance is the ONLY theme choice this site offers. The accent picker that
// used to sit beside it is gone: the site has one theme now (see the pineapple
// block in site.css), and a control that repaints half a page the palette was
// tuned against is a way to leave, not a feature. The accent is pinned in
// main.tsx instead. @pineappleui/theme still exports `setAccentColor` and the
// gallery still uses it — the picker is what this site dropped, not the
// capability.
//
// Two appearance controls are rendered and site.css shows exactly one: the
// three-way segmented control needs ~180px it does not have on a phone, so
// below 860px it gives way to a single button that cycles the same three
// values. `display: none` keeps the hidden one out of the a11y tree too, so
// this is one control per viewport, not two.

// A 3-literal UI vocabulary, not a tokens collection.
const APPEARANCES: readonly AppearanceSetting[] = ['light', 'dark', 'system'];

function nextAppearance(current: AppearanceSetting): AppearanceSetting {
  const index = APPEARANCES.indexOf(current);
  return APPEARANCES[(index + 1) % APPEARANCES.length] ?? current;
}

export function ThemeControls() {
  const { appearance, setAppearance } = useThemePreferences();
  const next = nextAppearance(appearance);

  return (
    <Inline gap="3" align="center">
      <SegmentedControl.Root
        className="site-appearance-segments"
        size="1"
        value={appearance}
        onValueChange={value => setAppearance(value as AppearanceSetting)}
        aria-label="Appearance"
      >
        {APPEARANCES.map(setting => (
          <SegmentedControl.Item key={setting} value={setting}>
            {setting}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      {/* Text, not a glyph: @pineappleui/icons has no sun/moon/monitor in
          ICON_NAMES, and inventing one here would be a second icon vocabulary.
          The label states where the button is and where it goes next, because
          "system" alone does not say which of the two it means. The width is
          pinned in site.css so cycling does not shuffle the header sideways
          under the finger that just tapped it. */}
      <Button
        className="site-appearance-cycle"
        type="button"
        size="1"
        variant="soft"
        aria-label={`Appearance: ${appearance}. Switch to ${next}.`}
        onClick={() => setAppearance(next)}
      >
        {appearance}
      </Button>
    </Inline>
  );
}
