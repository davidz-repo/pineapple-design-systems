import { act } from 'react';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, repoRoot, SUSPENSE_TIMEOUT } from '../../test-helpers';

import type { PackagePropsDoc } from '../../content';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

// The Props section, on the real pipeline: `generated/props/<slug>.json` as the
// site's `props` task wrote it, which the `test` task depends on.
//
// Two packages' props are stood in for, and each stands in for something the
// real artifact cannot be:
//
//   - a FIXTURE doc, because the cell contents are the claim here, and the real
//     ones are @radix-ui/themes' — asserting a type string against them would
//     be asserting the version that happens to be installed, and would go red
//     on an upgrade that broke nothing;
//   - a MISSING doc, because the artifact is generated and gitignored, so the
//     state where it does not exist is the one a reader hits when the pipeline
//     is broken. `scripts/check-props-coverage.mjs` fails a build in that
//     state; this is what the page says if one ever gets past it.
//
// Everything else reads the file on disk, which is what makes this suite the
// proof that the turbo edge from `test` to `props` is wired at all.

const {
  FIXTURE_SLUG,
  MISSING_SLUG,
  PENDING_SLUG,
  FAILING_SLUG,
  chunkFailure,
  fixtureDoc,
} = vi.hoisted(() => ({
  // A Radix wrapper, so the section's link to the primitive underneath renders.
  FIXTURE_SLUG: 'box',
  MISSING_SLUG: 'card',
  // A load that never settles, and one that rejects the way a stale chunk hash
  // does after a redeploy.
  PENDING_SLUG: 'badge',
  FAILING_SLUG: 'heading',
  chunkFailure: new Error('Failed to fetch dynamically imported module'),
  fixtureDoc: {
    slug: 'box',
    components: [
      {
        name: 'Widget',
        description: 'A widget, for this test.',
        props: [
          {
            name: 'count',
            type: 'number',
            required: true,
            description: 'How many times to draw it.',
            isLayout: false,
          },
          {
            name: 'tone',
            type: '"apricot" | "blue" | "cerise"',
            required: false,
            default: '"iris"',
            description: 'Which tone to draw it in.',
            isLayout: false,
          },
          {
            name: 'label',
            type: 'string',
            required: false,
            description: '',
            isLayout: false,
          },
          // No description on either, which is the reverse of the real
          // artifact — Radix documents all 41 of its layout props and leaves 68
          // of the 98 own props bare. Reversed on purpose: it puts a described
          // table and an undescribed one inside ONE component, which is where
          // the "does this table draw a Description column" decision has to be
          // made.
          {
            name: 'mt',
            type: 'string',
            required: false,
            description: '',
            isLayout: true,
          },
          {
            name: 'mb',
            type: 'string',
            required: false,
            description: '',
            isLayout: true,
          },
        ],
      },
      { name: 'Widget.Empty', description: '', props: [] },
    ],
  },
}));

vi.mock('../../content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../content')>();
  // Stable promises, not fresh ones per call: `use()` needs the same instance
  // across render retries — the same reason content.ts caches its loaders.
  const failing = Promise.reject(chunkFailure);
  // Marks it handled so Node does not report an unhandled rejection before the
  // render gets to it. The promise is still rejected, and `use()` still throws.
  failing.catch(() => {});
  const stubbed = new Map<string, Promise<unknown>>([
    [FIXTURE_SLUG, Promise.resolve(fixtureDoc)],
    [MISSING_SLUG, Promise.resolve(null)],
    [PENDING_SLUG, new Promise(() => {})],
    [FAILING_SLUG, failing],
  ]);
  return {
    ...actual,
    // eslint-disable-next-line ts/promise-function-async -- same rule as the real loader: `async` would mint a fresh promise per call and break `use()` identity
    propsFor: (slug: string) => stubbed.get(slug) ?? actual.propsFor(slug),
  };
});

/** The Props section, once its own Suspense boundary has resolved. */
async function findPropsSection(): Promise<HTMLElement> {
  const section = await screen.findByRole('region', { name: 'Props' }, SUSPENSE_TIMEOUT);
  // The heading is OUTSIDE the boundary now, on purpose, so finding the region
  // no longer means the body has landed. The skeleton going is what does.
  await waitFor(
    () => { expect(section.querySelector('.tab-skeleton')).toBeNull(); },
    SUSPENSE_TIMEOUT,
  );
  return section;
}

/** One prop's row, found by the row header that names it. */
function rowFor(table: HTMLElement, name: string): HTMLElement {
  const cell = within(table).getByRole('rowheader', { name: new RegExp(`^${name}\\b`) });
  const row = cell.closest('tr');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

describe('the props table', () => {
  it('renders a real table: one row per prop, with its type, default and description', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    const [table] = within(props).getAllByRole('table');
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent))
      .toEqual(['Prop', 'Type', 'Default', 'Description']);

    const tone = rowFor(table, 'tone');
    expect(within(tone).getAllByRole('cell').map(cell => cell.textContent))
      .toEqual(['"apricot" | "blue" | "cerise"', '"iris"', 'Which tone to draw it in.']);

    // A prop with no default gets the placeholder, and it is decorative: an
    // empty cell already reads as empty, and "em dash" announced on every
    // optional prop is noise.
    const [, defaultCell] = within(rowFor(table, 'label')).getAllByRole('cell');
    expect(defaultCell).toHaveTextContent('—');
    expect(within(defaultCell).getByText('—')).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks a required prop, and puts it first', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const [table] = within(await findPropsSection()).getAllByRole('table');

    // The name is a row HEADER, so reading across the row a screen reader says
    // which prop the type and default belong to — and the badge is part of that
    // name rather than a colour a sighted reader has to decode.
    const headers = within(table).getAllByRole('rowheader').map(cell => cell.textContent ?? '');
    expect(headers[0]).toBe('countRequired');
    expect(headers.slice(1).some(header => header.includes('Required'))).toBe(false);
  });

  it('names the table for a screen reader without repeating it on the page', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // A caption is how a screen reader lists a page's tables; the h3 above
    // already says it on screen, so the caption is announced and not drawn.
    // Nothing else here would notice the class going missing — the name would
    // still be right, and "Widget props" would print itself above the table.
    const caption = within(props).getByText('Widget props');
    expect(caption.tagName).toBe('CAPTION');
    expect(caption).toHaveClass('site-visually-hidden');
  });

  it('scrolls the table rather than the page, like a README\'s own tables', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const [table] = within(await findPropsSection()).getAllByRole('table');

    // A generated type can be 200 characters (Radix's accent union is 26 string
    // literals). The wrapper is what keeps that inside the column instead of
    // pushing the whole page sideways, and it is a div a later edit dissolves
    // without noticing.
    expect(table.closest('.props-table-scroll')).not.toBeNull();
  });

  it('names what a layout prop is, where there are any', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // The section invents the term and then labels a collapsed control with
    // it. On Box that control holds p, m, width and position — everything the
    // component exists for — while the table above it shows as/asChild/display.
    expect(within(props).getByText(
      /shared layout props — margin, padding, width, height and position/,
    )).toBeInTheDocument();
  });

  it('leaves that sentence off a package with no layout props, and lists the props it does declare', async () => {
    // Real artifact. `live-region` has components and no layout prop on any of
    // them, so the sentence would describe a disclosure that is not on the
    // page — and it declares `className` and `id` ITSELF, which is why the
    // paragraph claims "the DOM attributes React declares for every element"
    // rather than "the standard DOM attributes React passes through": the
    // second one is false right here.
    await renderApp('/components/live-region');
    const props = await findPropsSection();

    expect(within(props).queryByText(/shared layout props/)).not.toBeInTheDocument();
    const [table] = within(props).getAllByRole('table');
    expect(within(table).getByRole('rowheader', { name: /^className\b/ })).toBeInTheDocument();
  });

  it('links the primitive underneath, from the registry rather than a written URL', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // The same label the link row under the title gives the same href — two
    // names for one destination is what PackageLinks' header records removing.
    const link = within(props).getByRole('link', { name: /^Radix Box/ });
    expect(link).toHaveAttribute('href', 'https://www.radix-ui.com/themes/docs/components/box');
    expect(link).toHaveAttribute('target', '_blank');
    // Off-site, and it says so in the name — the same note the link row under
    // the title carries, from the same component.
    expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
    expect(within(link).getByText(/opens in a new tab/)).toHaveClass('site-visually-hidden');
  });
});

describe('the layout props', () => {
  it('keeps them behind a disclosure that names its component', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // 41 of Box's 44 props are the margin/padding/position set every Radix
    // component has. In the table they bury the props that make this component
    // different from the next one.
    expect(within(props).queryByRole('rowheader', { name: /^mt\b/ })).not.toBeInTheDocument();

    // The visible text repeats on every component that has them, so the NAME
    // says which — starting with the visible text, so a voice-control user can
    // still say what they read (WCAG 2.5.3, Label in Name, Level A).
    //
    // FOUND by that relationship rather than by a literal name, because the
    // relationship is the requirement. Two independent string assertions — one
    // on the name, one on the text — both passed while the name read "Show THE
    // 2 layout props for Widget" and the button read "Show 2 layout props",
    // which is the exact failure this is here to catch.
    const toggle = within(props).getByRole('button', {
      name: (accessibleName, element) => accessibleName.startsWith(element.textContent ?? ''),
    });
    expect(toggle).toHaveTextContent('Show 2 layout props');
    expect(toggle).toHaveAccessibleName('Show 2 layout props for Widget');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // The region it controls is in the document from the start, so
    // `aria-controls` always names something real.
    const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');

    await act(async () => {
      fireEvent.click(toggle);
    });

    // Same relationship on the other side of the toggle: the verb changes in
    // both strings or in neither.
    expect(toggle.getAttribute('aria-label')).toMatch(
      new RegExp(`^${toggle.textContent ?? ''}\\b`),
    );
    expect(toggle).toHaveAccessibleName('Hide 2 layout props for Widget');
    expect(toggle).toHaveTextContent('Hide 2 layout props');
    const layoutTable = within(region as HTMLElement).getByRole('table');
    expect(within(layoutTable).getAllByRole('rowheader').map(cell => cell.textContent))
      .toEqual(['mt', 'mb']);
  });

  it('drops the Description column on a table where no prop has one', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // Per TABLE. 68 of the artifact's 98 own props carry no JSDoc, and on
    // eight of the sixteen packages that is EVERY row — a Description header
    // over nothing, holding a 14rem floor that starves the Type column beside
    // it on a phone. The same component's other table keeps its column.
    const [own] = within(props).getAllByRole('table');
    expect(within(own).getAllByRole('columnheader').map(cell => cell.textContent))
      .toEqual(['Prop', 'Type', 'Default', 'Description']);

    await act(async () => {
      fireEvent.click(within(props).getByRole('button', { name: /layout props/ }));
    });

    const [, layout] = within(props).getAllByRole('table');
    expect(within(layout).getAllByRole('columnheader').map(cell => cell.textContent))
      .toEqual(['Prop', 'Type', 'Default']);
    // And no orphan cell left behind the missing header.
    expect(within(rowFor(layout, 'mt')).getAllByRole('cell')).toHaveLength(2);
  });
});

describe('while the generated file is still on its way, and when it never arrives', () => {
  it('keeps the Props heading on the page for the whole load', async () => {
    // docs/plan.md: "Every package page has the same heading outline, whatever
    // its README says. h1 package name -> h2 Examples (h3 per story) -> h2
    // README -> h2 Props (h3 per component)." The props file loads after the
    // page is already up, and inside the boundary the outline read h1 ->
    // Examples -> README -> nothing until it landed — with no announcement
    // that anything was coming, since the skeleton is `aria-hidden`.
    await renderApp(`/components/${PENDING_SLUG}`);

    // Not `findPropsSection`: the point is the state that helper waits past.
    const heading = await screen.findByRole('heading', { name: 'Props', level: 2 }, SUSPENSE_TIMEOUT);
    const section = screen.getByRole('region', { name: 'Props' });
    expect(heading).toBeInTheDocument();
    // Still loading — this is the heading standing over the skeleton, which is
    // the whole claim.
    expect(section.querySelector('.tab-skeleton')).not.toBeNull();
  });

  it('costs the props section rather than the whole Overview when its chunk fails', async () => {
    // The trigger is ordinary: the site redeploys, a reader's open tab still
    // holds the old chunk hashes, and the import 404s. Without a boundary here
    // the nearest one up covers the entire tab, so the examples and the README
    // that had ALREADY rendered are replaced by "Heading's docs failed to
    // render". ExamplesSection refuses the same trade one section up.
    await renderApp(`/components/${FAILING_SLUG}`);

    const props = await screen.findByRole('region', { name: 'Props' }, SUSPENSE_TIMEOUT);
    expect(await within(props).findByText(
      'The props table for this package could not be loaded.',
      {},
      SUSPENSE_TIMEOUT,
    )).toBeInTheDocument();
    expect(within(props).getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // The rest of the Overview is untouched, and the page-wide fallback never
    // ran.
    expect(screen.getByRole('heading', { name: 'README', level: 2 })).toBeInTheDocument();
    expect(screen.queryByText(/docs failed to render/)).not.toBeInTheDocument();
  });
});

describe('what it says when there is nothing to show', () => {
  it('says a component declares no props of its own rather than drawing an empty table', async () => {
    await renderApp(`/components/${FIXTURE_SLUG}`);
    const props = await findPropsSection();

    // A real answer, not a failure: `@pineappleui/theme`'s DesignSystemProvider
    // takes `children` and nothing else. An empty table would say the same
    // thing in a shape that looks broken.
    expect(within(props).getByText('Widget.Empty declares no props of its own.'))
      .toBeInTheDocument();
    expect(within(props).getAllByRole('table')).toHaveLength(1);
  });

  it('says a package exports no components at all', async () => {
    // tokens is pure data and use-local-storage is a hook; neither has a
    // component for a props table to be about. Real artifact, not a stub.
    await renderApp('/components/tokens');
    const props = await findPropsSection();

    expect(within(props).getByText(
      'This package exports no components, so there are no props to document.',
    )).toBeInTheDocument();
    expect(within(props).queryByRole('table')).not.toBeInTheDocument();
  });

  it('distinguishes an ungenerated table from a package with nothing to document', async () => {
    await renderApp(`/components/${MISSING_SLUG}`);
    const props = await findPropsSection();

    // The two look identical in the artifact — an absent file and a file with
    // no components both leave the page with nothing to draw — and they are
    // completely different problems. This one is the build's, and saying so is
    // what keeps a broken pipeline from reading as a package that documents
    // nothing.
    expect(within(props).getByText('This build has no generated props table for this package.'))
      .toBeInTheDocument();
  });
});

describe('the generated artifact', () => {
  it('is what the page reads, for the real packages', async () => {
    // No stub: this is `generated/props/text-field.json` as the `props` task
    // wrote it, rendered by the real section. If the turbo edge from `test` to
    // `props` were removed, the glob would match nothing and this would be the
    // "no generated props table" line instead.
    await renderApp('/components/text-field');
    const props = await findPropsSection();

    expect(within(props).getAllByRole('heading', { level: 3 }).map(h => h.textContent))
      .toEqual(['TextField.Root', 'TextField.Slot']);

    const [root] = within(props).getAllByRole('table');
    const [type, byDefault] = within(rowFor(root, 'variant')).getAllByRole('cell');
    // Pinnable because the extractor SORTS an expanded literal union now. Left
    // in the checker's own order this string was a function of the whole
    // program's type ids — it read `"soft" | "surface" | "classic"` — so a
    // seventeenth package could reshuffle it and land here as a red test whose
    // message named nothing about the cause.
    expect(type).toHaveTextContent('"classic" | "soft" | "surface"');
    expect(byDefault).toHaveTextContent('"surface"');

    // React mechanics rather than props of this component, and they are on
    // nearly every row of every package — dropped by the extractor, and this is
    // where that shows up on the page.
    expect(within(props).queryByRole('rowheader', { name: /^children\b/ })).not.toBeInTheDocument();
    expect(within(props).queryByRole('rowheader', { name: /^ref\b/ })).not.toBeInTheDocument();
    // So are the ~295 standard `<input>` attributes React declares.
    expect(within(props).queryByRole('rowheader', { name: /^placeholder\b/ }))
      .not
      .toBeInTheDocument();
  });

  it('carries every field the page reads, for every package', () => {
    // The generator writes this shape from JSDoc typedefs and content.ts reads
    // it through hand-written interfaces: two declarations of one contract,
    // with nothing between them that fails when they drift. This is that
    // check — against the file on disk, not a fixture.
    const dir = path.join(repoRoot, 'apps/site/generated/props');
    const slugs = ['text-field', 'button', 'icons', 'theme', 'tokens'];

    for (const slug of slugs) {
      // Read as the type the PAGE reads it as. The assertion is that the bytes
      // on disk actually are that — the cast is the claim under test, not a way
      // around it.
      const doc = JSON.parse(
        readFileSync(path.join(dir, `${slug}.json`), 'utf8'),
      ) as PackagePropsDoc;
      expect(doc.slug).toBe(slug);
      expect(Array.isArray(doc.components)).toBe(true);

      for (const component of doc.components) {
        expect(typeof component.name).toBe('string');
        expect(typeof component.description).toBe('string');
        for (const prop of component.props) {
          expect(typeof prop.name).toBe('string');
          expect(typeof prop.type).toBe('string');
          expect(typeof prop.required).toBe('boolean');
          expect(typeof prop.description).toBe('string');
          expect(typeof prop.isLayout).toBe('boolean');
          // Optional, and absent rather than `undefined` when there is none —
          // which is what lets the page test for it with `=== undefined`.
          if ('default' in prop) {
            expect(typeof prop.default).toBe('string');
          }
        }
      }
    }
  });
});
