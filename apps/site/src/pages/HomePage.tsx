import { Badge } from '@pineappleui/badge';

import { Button } from '@pineappleui/button';
import { Card } from '@pineappleui/card';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { useThemePreferences } from '@pineappleui/theme';
import { ACCENT_COLORS } from '@pineappleui/tokens';
import { Link } from 'react-router';

import { CodeBlock } from '../components/CodeBlock';
import { forSlug, manifests } from '../content';
import { CATEGORIES, REGISTRY } from '../registry';

const BUTTON_VARIANTS = ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost'] as const;

// Every accent, painted with its own scale rather than the current theme's —
// clicking one makes it the theme accent. The list is spread from
// ACCENT_COLORS; a hand-typed copy fails scripts/check-token-drift.mjs.
function AccentShowcase() {
  const { accentColor, setAccentColor } = useThemePreferences();
  return (
    <Inline gap="2" align="center">
      {ACCENT_COLORS.map(color => (
        <button
          key={color}
          type="button"
          className="accent-swatch"
          style={{
            background: `var(--${color}-9)`,
            border: color === accentColor
              ? '2px solid var(--gray-12)'
              : '2px solid transparent',
            width: 22,
            height: 22,
            cursor: 'pointer',
          }}
          aria-label={`Use the ${color} accent`}
          aria-pressed={color === accentColor}
          onClick={() => setAccentColor(color)}
        />
      ))}
    </Inline>
  );
}

export function HomePage() {
  return (
    <Stack gap="6">
      <div className="home-hero">
        <Stack gap="4">
          <Heading as="h1" size="9">Pineapple UI</Heading>
          <Text as="p" size="4" color="gray">
            A presentational React design system: thin, typed wrappers over
            Radix Themes. Every package is a shell — props in, callbacks out —
            published independently under the
            {' '}
            <code>@pineappleui</code>
            {' '}
            scope.
          </Text>
          <CodeBlock code="npm install @pineappleui/theme @pineappleui/button" />
          <Inline gap="4" align="center">
            <Text size="2" color="gray">Try an accent:</Text>
            <AccentShowcase />
          </Inline>
          <Inline gap="2">
            {BUTTON_VARIANTS.map(variant => (
              <Button key={variant} variant={variant}>{variant}</Button>
            ))}
          </Inline>
        </Stack>
      </div>

      {CATEGORIES.map(category => (
        <Stack key={category} gap="3">
          <Heading as="h2" size="4">{category}</Heading>
          <div className="home-grid">
            {REGISTRY.filter(entry => entry.category === category).map((entry) => {
              const version = forSlug(manifests, entry.slug)?.version;
              return (
                <Card key={entry.slug} asChild className="home-card">
                  <Link to={`/components/${entry.slug}`}>
                    <Stack gap="2">
                      <Inline gap="2" align="center">
                        <Text weight="medium">{entry.name}</Text>
                        {version !== undefined && (
                          <Badge variant="soft" size="1">{`v${version}`}</Badge>
                        )}
                      </Inline>
                      <Text size="2" color="gray">{entry.blurb}</Text>
                    </Stack>
                  </Link>
                </Card>
              );
            })}
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
