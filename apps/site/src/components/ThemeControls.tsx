import { Button } from '@pineappleui/button';
import { Inline } from '@pineappleui/inline';

import { useThemePreferences } from '@pineappleui/theme';
import { ACCENT_COLORS } from '@pineappleui/tokens';
import { SegmentedControl, Select } from '@radix-ui/themes';

import type { AccentColor, AppearanceSetting } from '@pineappleui/tokens';

// The header's appearance + accent pickers, wired straight to the theme
// package's own preferences hook — the same store the FOUC script reads on
// the next load. The accent options are spread from ACCENT_COLORS; a
// hand-typed copy of that list fails scripts/check-token-drift.mjs.
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
  const { appearance, accentColor, setAppearance, setAccentColor } = useThemePreferences();
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
          "system" alone does not say which of the two it means. */}
      <Button
        className="site-appearance-cycle"
        type="button"
        size="1"
        variant="soft"
        aria-label={`Appearance: ${appearance}. Activate for ${next}.`}
        onClick={() => setAppearance(next)}
      >
        {appearance}
      </Button>
      <Select.Root
        size="1"
        value={accentColor}
        onValueChange={value => setAccentColor(value as AccentColor)}
      >
        <Select.Trigger aria-label="Accent color">
          <Inline gap="2" align="center" wrap="nowrap">
            <span className="accent-swatch" />
            <span className="site-accent-name">{accentColor}</span>
          </Inline>
        </Select.Trigger>
        <Select.Content>
          {ACCENT_COLORS.map(color => (
            <Select.Item key={color} value={color}>{color}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Inline>
  );
}
