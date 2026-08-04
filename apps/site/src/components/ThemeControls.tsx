import { Inline } from '@pineappleui/inline';

import { useThemePreferences } from '@pineappleui/theme';
import { ACCENT_COLORS } from '@pineappleui/tokens';
import { SegmentedControl, Select } from '@radix-ui/themes';

import type { AccentColor, AppearanceSetting } from '@pineappleui/tokens';

// The header's appearance + accent pickers, wired straight to the theme
// package's own preferences hook — the same store the FOUC script reads on
// the next load. The accent options are spread from ACCENT_COLORS; a
// hand-typed copy of that list fails scripts/check-token-drift.mjs.

// A 3-literal UI vocabulary, not a tokens collection.
const APPEARANCES: readonly AppearanceSetting[] = ['light', 'dark', 'system'];

export function ThemeControls() {
  const { appearance, accentColor, setAppearance, setAccentColor } = useThemePreferences();

  return (
    <Inline gap="3" align="center" wrap="nowrap">
      <SegmentedControl.Root
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
      <Select.Root
        size="1"
        value={accentColor}
        onValueChange={value => setAccentColor(value as AccentColor)}
      >
        <Select.Trigger aria-label="Accent color">
          <Inline gap="2" align="center" wrap="nowrap">
            <span className="accent-swatch" />
            {accentColor}
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
