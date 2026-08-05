import { use, useId, useState } from 'react';

import { Badge } from '@pineappleui/badge';
import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';

import { propsFor } from '../../content';
import { radixDocsUrl } from '../../packageLinks';
import { bySlug } from '../../registry';
import { NewTabNote } from './NewTabNote';

import type { ComponentDoc, PackagePropsDoc, PropDoc } from '../../content';

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
  const doc = use(propsFor(slug));
  const labelId = useId();

  return (
    <section aria-labelledby={labelId}>
      <Stack gap="5">
        <Heading as="h2" size="5" id={labelId}>Props</Heading>
        <PropsBody slug={slug} doc={doc} />
      </Stack>
    </section>
  );
}

function PropsBody({ slug, doc }: { slug: string; doc: PackagePropsDoc | null }) {
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
                props, so the NAME says which component — starting with the
                visible text, so a voice-control user can still say what they
                read (WCAG 2.5.3). Same shape as the examples' "Show code
                for …". */}
            <Button
              size="1"
              variant="ghost"
              color="gray"
              aria-expanded={areLayoutPropsShown}
              aria-controls={layoutId}
              aria-label={`${areLayoutPropsShown ? 'Hide' : 'Show'} the ${layoutProps.length} layout props for ${component.name}`}
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
            <th scope="col">Description</th>
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
              <td>{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
