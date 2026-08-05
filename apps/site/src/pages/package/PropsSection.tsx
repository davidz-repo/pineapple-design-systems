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
    //
    // `props-section` is the hook that gets this section's prose — its link,
    // and the bare `<code>` in its paragraph and its h3s — the treatment the
    // README one screen above already gives the identical elements (site.css).
    <section className="props-section" aria-labelledby={labelId}>
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
              {/* Two ways out in one sentence, because the failure this names
                  is DETERMINISTIC: a redeploy under an open tab leaves the
                  page holding chunk hashes that no longer exist, and retrying
                  asks for the same missing file again. PackagePage's fallback
                  carries two BUTTONS for exactly this reason; a section-sized
                  failure does not need a second control, but it does need to
                  say the thing the second control would have done. */}
              <Text as="p" size="3" color="gray">
                The props table for this package could not be loaded. Trying again is worth a
                shot — and if the site was redeployed while this page was open, reloading it is
                what fixes that one.
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
  // Derived, not assumed from "this package wraps Radix": theme wraps Radix and
  // has no layout prop on it, so the two sentences below would be describing a
  // disclosure that is not on the page and crediting prose that is not there.
  //
  // One signal for both, because it is the same fact twice: a package whose
  // props carry Radix's shared layout set is a package whose descriptions are
  // partly Radix's, and the five that carry none of them — icons, live-region,
  // theme, tokens, use-local-storage — are exactly the ones whose descriptions
  // are all this repo's own.
  const hasLayoutProps = doc.components.some(
    component => component.props.some(prop => prop.isLayout),
  );

  // Whether any table on this page will DROP its Description column — the same
  // `prop.description !== ''` test `PropsTable` makes, asked across the page so
  // the omission can be stated before a reader meets it rather than after.
  //
  // Derived from the artifact and from the registry, never from the slug. It
  // disappears the day `text-field`'s props are described and reappears if
  // another package ever regresses, which is the whole reason it is not written
  // as `slug === 'text-field'`. Both halves are needed: a package with own props
  // and no descriptions is the visible gap, and `radix !== undefined` is what
  // makes the last sentence true — it is the link this paragraph promises, and
  // it is rendered below by the same signal.
  const ownProps = doc.components.flatMap(
    component => component.props.filter(prop => !prop.isLayout),
  );
  const hasUndescribedOwnTable = radix !== undefined
    && ownProps.length > 0
    && ownProps.every(prop => prop.description === '');

  return (
    <>
      <Text as="p" size="2" color="gray">
        {/* What the table lists, stated as the rule the extractor actually
            applies: a prop is here when the package — or the library
            underneath it — declares it. The claim used to be "the standard DOM
            attributes React passes through are not listed", which is not true
            of live-region's own `className` and `id`, and a reader who meets
            one of those in the table learns the sentence is approximate. */}
        {'Generated from each component\'s own types: every prop the package, or the library underneath it, declares. The DOM attributes React declares for every element are not listed, and neither are '}
        <code>children</code>
        {' or '}
        <code>ref</code>
        .
        {/* "Layout props" is vocabulary this section invents, and on Box
            everything the component exists for — p, m, width, position — sits
            behind a control labelled with it. Naming them here fixes both the
            term and that page, and it does it without lengthening the button's
            own label, which would drag its accessible name along too. */}
        {hasLayoutProps && ' Every component here also takes Radix Themes\' shared layout props — margin, padding, width, height and position — listed separately under each one below.'}
        {/* The third omission this paragraph declares, and the only one a
            reader will actually notice: a missing Description column used to be
            the norm (9 tables of 16 lacked one) and is now the sole exception,
            so arriving from Button and getting three columns reads as an
            unfinished page. Section header, line 25: what the table does NOT
            list is stated on the page rather than left silent.

            In the INTRO rather than beside the table, because an explanation
            that arrives after the column-less table has already been read is
            worth nothing.

            The primitive is NAMED from the registry, the same field the link
            below is built from, so the sentence cannot come to name the wrong
            component on a page it was not written for. And it cannot arrive on
            an unexpected page either: `scripts/check-props-coverage.mjs` fails
            the build on an undescribed own prop unless the package is
            allow-listed there with its reason, so the only page this can render
            on is one where that reason has been written down. */}
        {hasUndescribedOwnTable && (
          <>
            {' These tables carry no Description column: this package passes Radix\'s '}
            {radix.name}
            {' through whole, so there is no props type of its own to describe them in. Radix\'s own documentation, linked below, is where they are described.'}
          </>
        )}
      </Text>
      {doc.components.map(component => (
        <ComponentProps key={component.name} component={component} />
      ))}
      {/* Provenance, AFTER the tables it is about. Above them it was the third
          and fourth sentences of ~78 words of preamble, and the one sentence a
          reader needs before they start reading — where the layout props went —
          was buried behind them. Whose words these are is worth saying and is
          not worth reading first. */}
      {(hasLayoutProps || radix !== undefined) && (
        <Text as="p" size="2" color="gray">
          {/* Written by the KIND of prop rather than by a count, which is the
              property worth keeping: it survives text-field gaining
              descriptions, Radix shipping JSDoc, and another wrapper being
              added. What it can NOT be written by is where a prop comes from.
              Every wrapper package now DECLARES the props it passes through —
              same types, same defaults, re-stated only to carry a description —
              so a prop that "comes from Radix" is exactly a prop whose sentence
              is the package's, which is the opposite of what a provenance
              sentence phrased that way says. The declaration site is the line
              that holds: whoever wrote the sentence owns it.

              And Radix-worded rows are NOT confined to the disclosure, which is
              what an earlier draft of this claimed. `inline.json` and
              `stack.json` each carry nine of them in the MAIN table — align,
              as, asChild, display, gap, gapX, gapY, justify, wrap — and all
              three of box's own props likewise. `hasLayoutProps` is still the
              right gate for a different reason: every page with layout props has
              Radix-worded rows somewhere, and the three without (icons,
              live-region, theme) are 100% this repo's own words, where silence
              reads as "these are ours".

              "Corrected where" rather than "verbatim", because they are not
              verbatim: extract-props.mjs overrides `gapX` and `gapY`, whose
              upstream JSDoc describes the opposite axis from the one they set.
              "Its own documentation" rather than "its types", which reads as a
              reference to the Type column beside it. */}
          {hasLayoutProps && 'Where a package describes a prop itself, the words here are the package\'s. The rest are Radix\'s own, corrected where its own documentation describes a prop wrongly.'}
          {radix !== undefined && (
            <>
              {' '}
              {/* The same label PackageLinks gives the same href on the same
                  page. Two names for one destination is the thing that file's
                  own header records removing. */}
              <a href={radixDocsUrl(radix)} target="_blank" rel="noreferrer">
                {`Radix ${radix.name}`}
                <NewTabNote />
              </a>
              {' documents the primitive underneath.'}
            </>
          )}
        </Text>
      )}
    </>
  );
}

function ComponentProps({ component }: { component: ComponentDoc }) {
  const [areLayoutPropsShown, setAreLayoutPropsShown] = useState(false);
  const layoutId = useId();
  // An id rather than a ref, and not a stylistic choice: apps/site declares
  // `pineapple.refTestNotApplicable` on the grounds that no component here
  // takes a ref, and `scripts/check-ref-tests.mjs` reads the source to make
  // sure that stays true. A ref-forwarding component in an app that exports
  // nothing would be ceremony bought with a false declaration. The disclosure
  // already pairs its two halves by id — that is what `aria-controls` is.
  const openerId = useId();

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
          <LayoutPropsToggle
            id={openerId}
            component={component}
            count={layoutProps.length}
            controls={layoutId}
            isShown={areLayoutPropsShown}
            onToggle={() => setAreLayoutPropsShown(shown => !shown)}
          />
          {/* The region stays in the document so `aria-controls` always names
              something real; the forty rows are drawn only once asked for. */}
          <div id={layoutId}>
            {areLayoutPropsShown && (
              <PropsTable caption={`${component.name} layout props`} props={layoutProps} />
            )}
          </div>
          {/* The same control again, at the bottom. Box's expanded layout table
              is 41 rows and about 8,000px, so the only way to close it was to
              scroll back past everything you had just opened.

              It sits OUTSIDE the region it controls, and closing from here puts
              focus back on the opener — a control that removes itself takes the
              reader's focus to the document body with it, and the opener is
              also where the page has just scrolled back to. */}
          {areLayoutPropsShown && (
            <LayoutPropsToggle
              component={component}
              count={layoutProps.length}
              controls={layoutId}
              isShown
              onToggle={() => {
                setAreLayoutPropsShown(false);
                document.getElementById(openerId)?.focus();
              }}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function LayoutPropsToggle({
  id,
  component,
  count,
  controls,
  isShown,
  onToggle,
}: {
  /** Set on the opener only — the copy at the bottom focuses it by this. */
  id?: string;
  component: ComponentDoc;
  count: number;
  controls: string;
  isShown: boolean;
  onToggle: () => void;
}) {
  const verb = isShown ? 'Hide' : 'Show';

  return (
    // Inline so the button keeps its own width: a Stack is a flex column and
    // would stretch it across the page.
    <Inline gap="2">
      {/* The visible text repeats on every component that has layout props, so
          the NAME says which component — and the name has to START with the
          visible text, word for word, or a voice-control user saying what they
          read gets no match (WCAG 2.5.3, Label in Name, Level A). One inserted
          "the" is enough to break it. Same shape as the examples' "Show code
          for …".

          Both copies of this control carry the same name, which is what two
          controls doing one thing are supposed to do. */}
      <Button
        id={id}
        size="1"
        variant="ghost"
        color="gray"
        aria-expanded={isShown}
        aria-controls={controls}
        aria-label={`${verb} ${count} layout props for ${component.name}`}
        onClick={onToggle}
      >
        {`${verb} ${count} layout props`}
      </Button>
    </Inline>
  );
}

function PropsTable({ caption, props }: { caption: string; props: PropDoc[] }) {
  const captionId = useId();

  // Per TABLE, not per section: 13 of the 98 non-layout props in the artifact
  // carry no JSDoc, and all 13 are `text-field`'s — the one package that
  // re-exports Radix's compound namespace whole rather than declaring a props
  // type it could describe them in, so both its tables are entirely undescribed.
  // A Description header over seven empty cells is a column that says the page
  // is missing something; worse, it holds a 14rem floor that is exactly what
  // starves the Type column beside it on a phone. The layout tables keep theirs,
  // because Radix documents all 41.
  const hasDescriptions = props.some(prop => prop.description !== '');

  return (
    // The same treatment MarkdownView gives a README's own tables: scroll the
    // table rather than the page, so the prose around it keeps its line length
    // on a phone.
    //
    // Focusable and named, because above 767px this container scrolls for all
    // sixteen packages, not occasionally like a wide README table. Chrome made
    // scroll containers keyboard-focusable by default in 127, and that is
    // neither universal nor something to rely on; where it does apply, an
    // unnamed one is announced as "scrollable region" and nothing else. The
    // caption is already computed and already unique per table.
    <div
      className="props-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      {/* Every ARIA role below 768px is doing the work the element's own tag
          normally does: the stacked layout (site.css) sets `display: block` on
          the table and its parts, and changing a table's `display` DROPS its
          implicit semantics in every engine — the table, its rows, its cells
          and the relationships between them. Stated explicitly they survive the
          restyle, and above the breakpoint they are the roles these elements
          already have, so nothing changes.

          `aria-labelledby` rather than leaning on the caption for the same
          reason: HTML's caption-names-the-table rule is a native mechanism, and
          this element stops being a native table on a phone. The `<caption>`
          stays where it is — it is what a screen reader's table list reads. */}
      <table className="props-table" role="table" aria-labelledby={captionId}>
        <caption id={captionId} role="caption" className="site-visually-hidden">{caption}</caption>
        <thead role="rowgroup">
          {/* Visually hidden below the breakpoint, never removed: the column
              headers are how a screen reader associates a stacked cell with
              its column, and `data-label` below is the same fact drawn for
              everyone else. */}
          <tr role="row">
            <th scope="col" role="columnheader">Prop</th>
            <th scope="col" role="columnheader">Type</th>
            <th scope="col" role="columnheader">Default</th>
            {hasDescriptions && <th scope="col" role="columnheader">Description</th>}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {props.map(prop => (
            <tr role="row" key={prop.name}>
              {/* A row header, not a cell: reading across a row, a screen
                  reader then says which prop the type and default belong to.
                  It takes no `data-label` — stacked, the prop name is the
                  block's title rather than one of its labelled values. */}
              <th scope="row" role="rowheader">
                <Inline gap="2" align="center">
                  <code>{prop.name}</code>
                  {prop.required && <Badge size="1" variant="soft" color="amber">Required</Badge>}
                </Inline>
              </th>
              <td role="cell" data-label="Type"><code className="props-type">{prop.type}</code></td>
              <td role="cell" data-label="Default">
                {prop.default === undefined
                  // Decorative: an empty cell already reads as empty, and an
                  // "em dash" announced on every optional prop is noise.
                  ? <span aria-hidden="true">—</span>
                  : <code>{prop.default}</code>}
              </td>
              {hasDescriptions && (
                <td role="cell" data-label="Description">{prop.description}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
