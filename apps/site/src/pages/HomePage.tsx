import { useState } from 'react';

import { Badge } from '@pineappleui/badge';

import { Button } from '@pineappleui/button';
import { Card } from '@pineappleui/card';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { Link } from 'react-router';

import { CodeBlock } from '../components/CodeBlock';
import { forSlug, manifests } from '../content';
import { jsxSnippet } from '../jsx-snippet';
import { CATEGORIES, REGISTRY } from '../registry';

const BUTTON_VARIANTS = ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost'] as const;

type ButtonVariant = typeof BUTTON_VARIANTS[number];

// The hero's secondary CTA scrolls to the component grid rather than
// navigating, so the grid needs a stable id to aim at.
const COMPONENTS_ANCHOR = 'components';

// The variant row's visible label, referenced by the group's aria-labelledby.
const VARIANT_LABEL_ID = 'home-variant-label';

// What the repo actually guarantees, not what it aspires to. Each line is
// something a check enforces: peers stay external in the published bundle
// (scripts/check-peer-externals.mjs reads dist/, not just the manifest), and
// versions are per package because changesets versions them that way.
const PROOF_POINTS: ReadonlyArray<{ label: string; detail: string }> = [
  {
    label: 'peers only',
    detail: 'React, React DOM and Radix Themes stay peers — no package here bundles its own copy.',
  },
  {
    label: 'per package',
    detail: 'Every package carries its own version and changelog; upgrade one without the rest.',
  },
];

// Licence, language, runtime — the three facts a reader checks before trying
// anything, so they sit next to the proof points rather than in a footer.
const PROJECT_FACTS = ['MIT', 'TypeScript', 'React 19'] as const;

// The six variants as a mini-demo rather than a row of buttons that do
// nothing: each one selects itself and the caption prints the JSX for the
// current pick, reusing the playground's own formatter. `aria-pressed` is the
// selection for assistive tech AND the styling hook (site.css), so the visual
// state cannot drift from the announced one — which is also why the caption is
// not a live region: the toggle already announces the change.
//
// The group is named by the visible "Pick a variant:" text via
// aria-labelledby, not by an aria-label only a screen reader would ever get:
// the sighted reader needs to be told this row is a control too, and one label
// serving both cannot drift from the other.
function VariantShowcase() {
  const [variant, setVariant] = useState<ButtonVariant>('solid');
  return (
    <Stack gap="2">
      <Inline gap="4" align="center">
        <Text id={VARIANT_LABEL_ID} size="2" color="gray">Pick a variant:</Text>
        {/* `align="center"` because the ghost variant is the odd box in this
            row: Radix gives it `height: fit-content` plus negative margins, so
            its layout box is its TEXT and its ink hangs outside. Without a
            cross-axis rule a definite height opts out of stretch and it pins to
            the top, sitting ~7px high against the other five. */}
        <Inline
          gap="2"
          align="center"
          className="home-variants"
          role="group"
          aria-labelledby={VARIANT_LABEL_ID}
        >
          {BUTTON_VARIANTS.map(name => (
            <Button
              key={name}
              variant={name}
              aria-pressed={name === variant}
              onClick={() => setVariant(name)}
            >
              {name}
            </Button>
          ))}
        </Inline>
      </Inline>
      <Text as="p" size="2" color="gray">
        {/* Children are the variant name because that is what the buttons on
            screen actually say — a snippet showing other text would be a
            snippet of something the reader cannot see. */}
        <code>{jsxSnippet('Button', { variant }, variant)}</code>
      </Text>
    </Stack>
  );
}

export function HomePage() {
  return (
    <Stack gap="6">
      <div className="home-hero">
        <Stack gap="4">
          {/* Responsive, and what it buys is a LINE, not a fit: size 9 is 66px
              at every width, and at 66px this name is 536px on one line, which
              needs a 600px viewport — so it never fits a phone either way.
              Re-measured for the shorter name, and it still earns its place:
              size 8 (38.5px, 322px wide) against size 9 at the same width gives
              1 line / 44px against 2 lines / 132px at 390px, and 2 lines / 88px
              against 2 / 132px at 320px. On the commonest phone width that is
              88px of hero the reader does not scroll past before reaching the
              sentence under it.

              What DID change with the name is the top end: at 536px the heading
              clears the main column the moment the `sm` breakpoint (768px)
              switches it to size 9, so it no longer wraps above the breakpoint
              at all — the old name needed about 1151px for that. A heading
              wrapping was never the defect; a heading taller than the
              viewport's first screen is, which is what size 9 still does on a
              phone. Nothing else on the site needs this; it is the only type on
              the page set large enough for the width to matter. */}
          <Heading as="h1" size={{ initial: '8', sm: '9' }}>Pineapple Design</Heading>
          {/* Does not say "design system" — the h1 one line up ends in
              "Design", and a subtitle that restates its own heading's words
              spends the first thing anyone reads on nothing. */}
          <Text as="p" size="4" color="gray">
            Thin, typed React wrappers over Radix Themes. Every package is a
            shell — props in, callbacks out — published independently under the
            {' '}
            <code>@pineappleui</code>
            {' '}
            scope.
          </Text>

          <Stack gap="3">
            {/* The claims, one badge and one sentence each. `align="start"`
                so the badge sits on the sentence's first line rather than
                floating to its middle when the sentence wraps. */}
            <Stack gap="2">
              {PROOF_POINTS.map(point => (
                <Inline key={point.label} gap="2" align="start">
                  <Badge variant="soft" size="1">{point.label}</Badge>
                  <Text size="2" color="gray">{point.detail}</Text>
                </Inline>
              ))}
            </Stack>
            {/* Status line: what it is, and how far along it is. One line,
                because both halves answer the same question. */}
            <Inline gap="2" align="center">
              {PROJECT_FACTS.map(fact => (
                <Badge key={fact} variant="soft" size="1" color="gray">{fact}</Badge>
              ))}
              <Text size="2" color="gray">
                Early — every package is 0.x and the API can still move.
              </Text>
            </Inline>
          </Stack>

          <CodeBlock code="npm install @pineappleui/theme @pineappleui/button" />

          <Inline gap="3" align="center">
            <Button asChild size="3">
              <Link to="/getting-started">Get started</Link>
            </Button>
            {/*
              A plain in-page href, not a router Link: the target is already on
              this page, so the browser scrolls to it (and sets the sequential
              focus point) without a route change.
            */}
            {/* Outline on the accent, not soft-on-gray. A grey chip beside an
                amber solid read as NEUTRAL on the yellow page; on a white one
                the same chip reads as INACTIVE, and this is a real action, not
                a disabled twin of the button next to it. */}
            <Button asChild size="3" variant="outline">
              <a href={`#${COMPONENTS_ANCHOR}`}>Browse components</a>
            </Button>
          </Inline>

          <VariantShowcase />
        </Stack>
      </div>

      {/* `tabIndex={-1}` makes the jump target focusable programmatically, so
          the browser can move focus here on the hash jump instead of leaving
          the next Tab at the top of the document. Not in the tab order. */}
      <Stack gap="6" id={COMPONENTS_ANCHOR} className="home-components" tabIndex={-1}>
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
    </Stack>
  );
}
