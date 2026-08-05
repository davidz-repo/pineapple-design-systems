import { Suspense, use, useId, useState } from 'react';

import { Badge } from '@pineappleui/badge';
import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';

import { ErrorBoundary } from '../../components/ErrorBoundary';
import { propsFor } from '../../content';
import { radixDocsUrl } from '../../packageLinks';
import { bySlug } from '../../registry';
import { NewTabNote } from './NewTabNote';
import { SectionSkeleton } from './TabSkeleton';

import type { ComponentDoc, PropDoc } from '../../content';

// The last section of the Overview: h1 package name → h2 Examples → h2 README →
// h2 Props. Generated at build time from each package's own TypeScript types
// (apps/site/scripts/generate-props.mjs), for the same reason the README above
// it is the package's own — a table maintained beside the source is wrong the
// first week nobody remembers to update it.
//
// What the table does NOT list is stated on the page rather than left silent. A
// pass-through wrapper's props type resolves to a few hundred properties, and
// ~95% of them are the standard DOM attributes React declares for every
// element; `children` and `ref` are React mechanics rather than props of this
// component. Both omissions are in the paragraph under the heading.

export function PropsSection({ slug }: { slug: string }) {
  const labelId = useId();

  return (
    // The section and its heading are OUTSIDE both wrappers below, and that is
    // the whole shape of this component. docs/plan.md guarantees every package
    // page the same outline — h1 name → h2 Examples → h2 README → h2 Props —
    // and the props table is the one section that loads after the page is
    // already up. Held inside the boundary, the outline read h1 → Examples →
    // README → nothing for the length of a dynamic import, with no
    // announcement that anything was coming: SectionSkeleton is `aria-hidden`,
    // deliberately.
    <section aria-labelledby={labelId}>
      <Stack gap="5">
        <Heading as="h2" size="5" id={labelId}>Props</Heading>
        {/* A boundary scoped to this section, not the tab's. The nearest one up
            is PackagePage's, which covers the whole Overview — so a props chunk
            that fails takes the examples and the README that had ALREADY
            rendered down with it. The trigger is ordinary: the site redeploys,
            a reader's open tab still holds the old chunk hashes, and the import
            of `generated/props/<slug>.json` 404s. ExamplesSection refuses the
            same trade one section up, and Props is the last section on the page
            and the cheapest of the three to lose. */}
        <ErrorBoundary
          fallback={(error, retry) => (
            <Stack gap="2" align="start">
              <Text as="p" size="3" color="gray">
                The props table for this package could not be loaded.
              </Text>
              <Text as="p" size="2" color="gray">{error.message}</Text>
              <Button size="2" variant="soft" onClick={retry}>Try again</Button>
            </Stack>
          )}
        >
          {/* Props waits on its own generated JSON, which nothing above the
              fold needs; under the tab's boundary it would keep the examples
              and the README off the screen for a file four screens down. */}
          <Suspense fallback={<SectionSkeleton />}>
            <PropsBody slug={slug} />
          </Suspense>
        </ErrorBoundary>
      </Stack>
    </section>
  );
}

function PropsBody({ slug }: { slug: string }) {
  const doc = use(propsFor(slug));

  // Not the same thing as "this package exports no components", and worth
  // saying differently: the generated file is missing, which means this build
  // ran without the site's `props` task. `scripts/check-props-coverage.mjs`
  // fails a build in that state, so this line is what a reader sees only if one
  // ever gets past it — rather than a page confidently reporting that the
  // package documents nothing.
  if (doc === null) {
    return (
      <Text as="p" size="3" color="gray">
        This build has no generated props table for this package.
      </Text>
    );
  }

  if (doc.components.length === 0) {
    return (
      <Text as="p" size="3" color="gray">
        This package exports no components, so there are no props to document.
      </Text>
    );
  }

  const radix = bySlug.get(slug)?.radix;

  return (
    <>
      <Text as="p" size="2" color="gray">
        {'Generated from each component\'s own types. The standard DOM attributes React passes through are not listed, and neither are '}
        <code>children</code>
        {' or '}
        <code>ref</code>
        .
        {radix !== undefined && (
          <>
            {' '}
            <a href={radixDocsUrl(radix)} target="_blank" rel="noreferrer">
              {`Radix Themes' ${radix.name}`}
              <NewTabNote />
            </a>
            {' documents the primitive underneath.'}
          </>
        )}
      </Text>
      {doc.components.map(component => (
        <ComponentProps key={component.name} component={component} />
      ))}
    </>
  );
}

function ComponentProps({ component }: { component: ComponentDoc }) {
  const [areLayoutPropsShown, setAreLayoutPropsShown] = useState(false);
  const layoutId = useId();

  // Radix gives every component the same margin/padding/size/position props —
  // 41 of Box's 44, and 41 of Stack's 51. Left in the table they bury the props
  // that make this component different from the next one, so they go behind a
  // disclosure, which is what Radix's own docs do with them.
  const ownProps = component.props.filter(prop => !prop.isLayout);
  const layoutProps = component.props.filter(prop => prop.isLayout);

  return (
    <Stack gap="2">
      {/* size="4" is what MarkdownView draws an h3 at, and the README's demoted
          sections are h3s on this same page: one heading level has to be one
          size, or the outline a reader hears and the scale they see
          disagree. */}
      <Heading as="h3" size="4"><code>{component.name}</code></Heading>
      {component.description !== '' && (
        <Text as="p" size="2" color="gray">{component.description}</Text>
      )}
      {ownProps.length === 0
        ? (
            <Text as="p" size="2" color="gray">
              {`${component.name} declares no props of its own.`}
            </Text>
          )
        : <PropsTable caption={`${component.name} props`} props={ownProps} />}
      {layoutProps.length > 0 && (
        <>
          {/* Inline so the button keeps its own width: a Stack is a flex column
              and would stretch it across the page. */}
          <Inline gap="2">
            {/* The visible text repeats on every component that has layout
                props, so the NAME says which component — and the name has to
                START with the visible text, word for word, or a voice-control
                user saying what they read gets no match (WCAG 2.5.3, Label in
                Name, Level A). One inserted "the" is enough to break it. Same
                shape as the examples' "Show code for …". */}
            <Button
              size="1"
              variant="ghost"
              color="gray"
              aria-expanded={areLayoutPropsShown}
              aria-controls={layoutId}
              aria-label={`${areLayoutPropsShown ? 'Hide' : 'Show'} ${layoutProps.length} layout props for ${component.name}`}
              onClick={() => setAreLayoutPropsShown(shown => !shown)}
            >
              {`${areLayoutPropsShown ? 'Hide' : 'Show'} ${layoutProps.length} layout props`}
            </Button>
          </Inline>
          {/* The region stays in the document so `aria-controls` always names
              something real; the forty rows are drawn only once asked for. */}
          <div id={layoutId}>
            {areLayoutPropsShown && (
              <PropsTable caption={`${component.name} layout props`} props={layoutProps} />
            )}
          </div>
        </>
      )}
    </Stack>
  );
}

function PropsTable({ caption, props }: { caption: string; props: PropDoc[] }) {
  // Per TABLE, not per section: 68 of the 98 non-layout props in the artifact
  // carry no JSDoc at all, and on eight of the sixteen packages — Button, Text,
  // Heading, Card, Badge among them — that is every row of the own-props table.
  // A Description header over four empty cells is a column that says the page
  // is missing something; worse, it holds a 14rem floor that is exactly what
  // starves the Type column beside it on a phone. The layout tables keep theirs,
  // because Radix documents all 41.
  const hasDescriptions = props.some(prop => prop.description !== '');

  return (
    // The same treatment MarkdownView gives a README's own tables: scroll the
    // table rather than the page, so the prose around it keeps its line length
    // on a phone.
    <div className="props-table-scroll">
      <table className="props-table">
        {/* Named for screen-reader table navigation, which lists a page's
            tables by caption; the h3 above already says it on screen. */}
        <caption className="site-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Prop</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            {hasDescriptions && <th scope="col">Description</th>}
          </tr>
        </thead>
        <tbody>
          {props.map(prop => (
            <tr key={prop.name}>
              {/* A row header, not a cell: reading across a row, a screen
                  reader then says which prop the type and default belong to. */}
              <th scope="row">
                <Inline gap="2" align="center">
                  <code>{prop.name}</code>
                  {prop.required && <Badge size="1" variant="soft" color="amber">Required</Badge>}
                </Inline>
              </th>
              <td><code className="props-type">{prop.type}</code></td>
              <td>
                {prop.default === undefined
                  // Decorative: an empty cell already reads as empty, and an
                  // "em dash" announced on every optional prop is noise.
                  ? <span aria-hidden="true">—</span>
                  : <code>{prop.default}</code>}
              </td>
              {hasDescriptions && <td>{prop.description}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
