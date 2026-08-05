// @vitest-environment node
//
// The props extraction, on the compiler API it ships with. `node` rather than
// the preset's jsdom: this drives `ts.sys`, reads real files, and renders
// nothing.
//
// Two subjects, and they answer different questions.
//
//   - packages/text-field and packages/stack, REAL packages: does the pipeline
//     hold against the source the site actually documents? text-field is the
//     compound one — a Radix namespace re-exported whole — so it is where the
//     descent, the inherited props and Radix's own declared defaults all have
//     to work at once. stack is where `gapX`/`gapY` land, which is the one
//     place this repo overrides an upstream description.
//   - props-fixtures/*, written here: are the cell contents right? Asserting a
//     type string or a default against Radix would be asserting the version of
//     @radix-ui/themes that happens to be installed, and it would go red on an
//     upgrade that broke nothing.

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { extractPackageProps, readCompilerOptions } from './extract-props.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(siteDir, '../..');

// The site's own options, which is what the `props` task compiles with — the
// fenced `paths` that map `@pineappleui/*` to source live in there.
const compilerOptions = readCompilerOptions(ts, path.join(siteDir, 'tsconfig.json'));

/**
 * @param {{ slug: string, entry: string }[]} entries
 * @returns {ReturnType<typeof extractPackageProps>} the docs and the program's own errors
 */
function extract(entries) {
  return extractPackageProps({ ts, entries, compilerOptions });
}

/** @param {string} name */
function fixture(name) {
  return { slug: name, entry: path.join(scriptsDir, 'props-fixtures', name) };
}

/**
 * @param {import('./extract-props.mjs').ComponentDoc} component
 * @param {string} name
 */
function propNamed(component, name) {
  return component.props.find(prop => prop.name === name);
}

describe('the real packages', () => {
  const { docs, diagnostics } = extract([
    { slug: 'text-field', entry: path.join(repoRoot, 'packages/text-field/src/index.ts') },
    { slug: 'stack', entry: path.join(repoRoot, 'packages/stack/src/index.ts') },
  ]);
  const [doc, stackDoc] = docs;

  it('compiles the package it reads', () => {
    // The extraction is only worth what the program behind it is worth: props
    // read off a broken program are `any`s that render exactly like real types.
    expect(diagnostics).toEqual([]);
  });

  it('descends into a compound component rather than documenting the namespace', () => {
    // `TextField` is Radix's namespace re-exported whole. The thing with props
    // is one level in, and there are two of them.
    expect(doc.components.map(component => component.name))
      .toEqual(['TextField.Root', 'TextField.Slot']);
  });

  it('recovers the defaults Radix publishes in its own types', () => {
    // Radix's prop defs are `as const`, so `default: "2"` survives into the
    // `.d.ts` as a literal TYPE — which is the only reason a wrapper that adds
    // no defaults of its own can still show any.
    const root = doc.components[0];
    expect(propNamed(root, 'size')?.default).toBe('"2"');
    expect(propNamed(root, 'variant')?.default).toBe('"surface"');
    // `radius` has no default of its own, and Radix says so by typing the
    // `default` as the prop's own union rather than one member of it.
    expect(propNamed(root, 'radius')?.default).toBeUndefined();
  });

  it('leaves out the DOM attributes React declares for every element', () => {
    const root = doc.components[0];
    // 311 properties resolve on this props type. `placeholder`, `disabled` and
    // `onChange` are three of the ~295 that are `<input>`'s own and are
    // documented by MDN.
    expect(root.props.length).toBeLessThan(20);
    for (const name of ['placeholder', 'disabled', 'onChange', 'className', 'id']) {
      expect(propNamed(root, name)).toBeUndefined();
    }
    // What is left is what the design system and the primitive declare.
    expect(propNamed(root, 'variant')).toBeDefined();
  });

  it('carves out ref and children', () => {
    for (const component of doc.components) {
      expect(propNamed(component, 'ref')).toBeUndefined();
      expect(propNamed(component, 'children')).toBeUndefined();
    }
  });

  it('marks the props every Radix component shares as layout props', () => {
    const root = doc.components[0];
    // Declared in Radix's shared `props/margin.props.d.ts`, not beside the
    // component — which is what puts them behind the page's disclosure.
    expect(propNamed(root, 'm')?.isLayout).toBe(true);
    expect(propNamed(root, 'mt')?.isLayout).toBe(true);
    expect(propNamed(root, 'variant')?.isLayout).toBe(false);
    // `TextField.Slot`'s padding props are declared in the component's OWN prop
    // file, so they are its props rather than the shared set: they stay in the
    // main table, which is where Radix's own docs put them too.
    expect(propNamed(doc.components[1], 'px')?.isLayout).toBe(false);
  });

  it('corrects the two upstream descriptions that are swapped', () => {
    // `props/gap.props.d.ts` documents `gapX` as row-gap while declaring
    // `--column-gap`, and `gapY` as the mirror of that. Both are own props on
    // Stack and Inline, in the default table, so uncorrected the site tells a
    // reader the horizontal and vertical gaps are the other way round — in its
    // own voice, since the page never says whose sentence it is.
    //
    // Asserted on the corrected text rather than on "not the upstream one", so
    // this goes red if Radix moves the module out from under the match as well
    // as if the override is deleted.
    const [stack] = stackDoc.components;
    expect(propNamed(stack, 'gapX')?.description).toBe(
      'Sets the CSS column-gap property. Supports space scale values, CSS strings, and '
      + 'responsive objects.',
    );
    expect(propNamed(stack, 'gapY')?.description).toBe(
      'Sets the CSS row-gap property. Supports space scale values, CSS strings, and '
      + 'responsive objects.',
    );
    // Its neighbour is untouched, which is the narrowness of the override:
    // upstream's `gap` is right and stays upstream's.
    expect(propNamed(stack, 'gap')?.description).toBe(
      'Sets the CSS gap property. Supports space scale values, CSS strings, and responsive '
      + 'objects.',
    );
  });
});

describe('the shapes a table has to render', () => {
  const [doc] = extract([fixture('shapes.tsx')]).docs;

  it('takes only the exports that are components', () => {
    // `widgetTone` is a function and lower-case; `WIDGET_TONES` is capitalised
    // and every member of it is callable, which is how an array of icon names
    // once came to be documented as a component with 35 props.
    expect(doc.components.map(component => component.name)).toEqual(['Widget']);
  });

  it('puts the required props first, then goes alphabetical', () => {
    expect(doc.components[0].props.map(prop => prop.name))
      .toEqual(['count', 'isLoud', 'label', 'tone']);
  });

  it('reads the required flag, the type, the default and the JSDoc', () => {
    const [component] = doc.components;
    expect(component.description).toBe(
      'A widget. Its own description, so the extractor has one to pick up.',
    );
    expect(propNamed(component, 'count')).toEqual({
      name: 'count',
      type: 'number',
      required: true,
      description: 'How many times to draw it. There is no sensible guess, so it is required.',
      isLayout: false,
    });
    expect(propNamed(component, 'tone')).toEqual({
      name: 'tone',
      type: '"apricot" | "blue" | "cerise" | "grass" | "iris" | "jade" | "lime" | "mint" | "plum" | "ruby"',
      required: false,
      // Written in the destructuring parameter, which leaves no trace in the
      // props type — the AST is the only place this exists.
      default: '"iris"',
      description: 'Which tone to draw it in.',
      isLayout: false,
    });
    // A prop with no JSDoc gets an empty description, not a missing key: the
    // page renders an empty cell rather than having to test for absence.
    expect(propNamed(component, 'label')?.description).toBe('');
    // `false` is a default like any other; only `undefined` means "none".
    expect(propNamed(component, 'isLoud')?.default).toBe('false');
  });

  it('strips the markdown JSDoc is written in and keeps the words', () => {
    // `PropDoc.description` is a string the page prints into a table cell, so
    // the markers have to go somewhere — and it is here rather than in the
    // cell, which would mean a block-level markdown renderer loose in a
    // four-column table. Radix writes `Sets the CSS **display** property` on
    // 197 of the artifact's 209 described props; unstripped, every one of them
    // shows its asterisks.
    expect(propNamed(doc.components[0], 'isLoud')?.description)
      .toBe('Whether it says so loudly — the data-loud attribute, not a style.');
  });

  it('drops ref and children even when the package declares them itself', () => {
    // These are on `WidgetProps` directly rather than inherited, which is the
    // case the `@types/react` filter alone would not catch.
    expect(propNamed(doc.components[0], 'children')).toBeUndefined();
    expect(propNamed(doc.components[0], 'ref')).toBeUndefined();
  });
});

describe('a compound component written in this repo\'s style', () => {
  const [doc] = extract([fixture('compound.tsx')]).docs;

  it('names each member component and nothing else', () => {
    // `DEFAULT_SIDE` is capitalised and sits in the same object; it is not
    // callable, so it is not a component.
    expect(doc.components.map(component => component.name)).toEqual(['Panel.Root', 'Panel.Slot']);
  });

  it('follows a member to the function it references for its defaults', () => {
    // `{ Root: PanelRoot }` gives the member a property assignment for a
    // declaration, and a property assignment has no parameter list. Without the
    // hop to `PanelRoot` these come back undefined — silently, since the props
    // themselves are all still found.
    expect(propNamed(doc.components[0], 'isOpen')?.default).toBe('true');
    expect(propNamed(doc.components[1], 'side')?.default).toBe('"left"');
    expect(propNamed(doc.components[0], 'title')?.required).toBe(true);
  });
});

describe('a package with no components', () => {
  // Extracted in the describe body, like the three above it. `extract` builds a
  // whole TypeScript program, which is by far the most expensive thing in this
  // file; done inside the `it` it is charged to that test's own timeout rather
  // than to collection, and on a loaded CI runner this one test was paying for
  // a program while the other three had already paid for theirs.
  const [doc] = extract([fixture('nothing.ts')]).docs;

  it('reports none rather than finding something in the data', () => {
    expect(doc).toEqual({ slug: 'nothing.ts', components: [] });
  });
});
