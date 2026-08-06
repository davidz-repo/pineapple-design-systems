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
    //
    // `Rem` is the third route in and the quietest: capitalised, callable with
    // one argument, and `string` is assignable to `ReactNode`, so it passed
    // every test the predicate made. Its props were the members of a `number`
    // — `toExponential`, `toFixed`, `toPrecision`, `valueOf` — which is a
    // WRONG table on a confident-looking page, not an absent one.
    expect(doc.components.map(component => component.name)).toEqual(['Widget']);
  });

  it('puts the required props first, then goes alphabetical', () => {
    expect(doc.components[0].props.map(prop => prop.name))
      .toEqual(['count', 'isLoud', 'label', 'level', 'reach', 'spread', 'step', 'tone']);
  });

  it('sorts an expanded union rather than printing it in the checker\'s order', () => {
    // `UnionType.types` is id-ordered, so the printed order was a function of
    // the whole PROGRAM: adding a package could reshuffle every enum cell in
    // all sixteen artifacts. `typeText` sorts, which makes the order a function
    // of the members alone.
    //
    // On a union declared REVERSE alphabetical, because that is the only shape
    // that can tell the sort from the absence of one. `tone` above is declared
    // alphabetically already and passes either way — and Radix-derived values
    // are the wrong place to pin this, since an upgrade would redden them for
    // reasons of its own.
    expect(propNamed(doc.components[0], 'spread')?.type)
      .toBe('"auto" | "narrow" | "wide"');
  });

  it('sorts a union inside a preserved alias, which is where most of them are', () => {
    // The half a top-level sort could not reach, and the reason this is a node
    // rewrite rather than an operation on the printed type: 179 of the
    // artifact's 277 props print as `Responsive<…>`, so the union is inside the
    // type ARGUMENT. `Heading.trim`, `Text.weight`, `Inline.align`,
    // `Stack.justify` and ten more moved on a docs commit that changed no type,
    // two of them in `box`, which that commit did not touch.
    //
    // The alias survives, which is the other half of the claim: expanding
    // `Wrapped<…>` here would print the whole breakpoint object where the name
    // was saying the useful thing.
    expect(propNamed(doc.components[0], 'reach')?.type)
      .toBe('Wrapped<"a" | "b" | "c">');
  });

  it('orders a union of numbers as a number line, not lexicographically', () => {
    // Code point is right for words and wrong for exactly one shape, and it is
    // the commonest one in the artifact: Radix's space scale, `"0"…"9" |
    // "-1"…"-9"`, which sorts to nine negatives followed by the scale a reader
    // actually wants. That is neither alphabetical-meaningful nor a number line.
    //
    // `"10"` is what tells the two rules apart in both directions — it sorts
    // before `"9"` as text and after it as a number — and the negatives are what
    // the 92 margin cells in the artifact are about.
    expect(propNamed(doc.components[0], 'step')?.type)
      .toBe('Wrapped<"-2" | "-1" | "0" | "2" | "10">');
    // The same rule on the other branch: a top-level union is EXPANDED rather
    // than printed as its alias, and it has its own sort.
    expect(propNamed(doc.components[0], 'level')?.type)
      .toBe('"-1" | "0" | "2" | "10"');
    // And a union that only LOOKS numeric keeps code point rather than being
    // half-ordered — `spread` above is words, and this is the mixed case the
    // every-member test is for.
    expect(propNamed(doc.components[0], 'tone')?.type)
      .toBe('"apricot" | "blue" | "cerise" | "grass" | "iris" | "jade" | "lime" | "mint" | "plum" | "ruby"');
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

describe('a prop the package and the library underneath it both document', () => {
  const [doc] = extract([fixture('overlay.tsx')]).docs;
  const [panel] = doc.components;

  it('prints the package\'s sentence, not both sentences run together', () => {
    // `getDocumentationComment` concatenates across declarations, upstream
    // first, and every wrapper here re-states a prop it inherits purely to hang
    // a sentence on it. So the day Radix documents one of those props, the cell
    // becomes two sentences that may disagree — still a string, still one line,
    // still plausible, and nothing fails.
    //
    // Asserted as an EQUALITY rather than "contains the local words", because
    // the failure is an appended sentence and `toContain` would pass on it.
    expect(propNamed(panel, 'gap')?.description).toBe(
      'The package\'s own words for a prop the library underneath also documents.',
    );
  });

  it('keeps upstream\'s sentence where the package wrote none', () => {
    // The other half, and what keeps the assertion above from being vacuous: if
    // Radix ever stopped documenting these, "the local sentence wins" would
    // still pass over a program with nothing to lose to. This is the layout
    // tables' whole content, so it is also the behaviour that must NOT change.
    expect(propNamed(panel, 'justify')?.description).toMatch(/^Sets the CSS justify-content/);
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

describe('a component whose declaration is a call', () => {
  const [doc] = extract([fixture('wrapped.tsx')]).docs;

  it('reads the defaults out of the function the call is handed', () => {
    // `forwardRef(function Chip({ tone = 'apricot' }, ref) {…})`, and
    // `memo(forwardRef(…))` around it. A lookup that stops at a direct
    // function finds a CallExpression, no parameter list, and no defaults —
    // and says nothing, because the props themselves all still resolve. The
    // Default column just goes blank for props that have one.
    expect(doc.components.map(component => component.name)).toEqual(['Chip', 'Pill']);
    expect(propNamed(doc.components[0], 'tone')?.default).toBe('"apricot"');
    expect(propNamed(doc.components[1], 'tone')?.default).toBe('"cerise"');
  });
});

describe('a component declared `React.FC`', () => {
  const [doc] = extract([fixture('react-fc.tsx')]).docs;

  it('takes both arms of the union `FunctionComponent` returns', () => {
    // `@types/react@19` types a function component's return as `ReactNode |
    // Promise<ReactNode>`, which is NOT assignable to `ReactNode` — `ReactNode`
    // contains `Promise<AwaitedReactNode>`, and `AwaitedReactNode` is itself
    // `ReactNode` minus that arm. A predicate asking only for assignability
    // finds neither of these, and Radix declares three of `DropdownMenu`'s
    // members this way.
    //
    // Sorted, because the order here is the module's symbol table — function
    // declarations hoist ahead of consts — and this fix claims nothing about
    // that. `Latch` is the row that matters: miss its `React.FC` member and it
    // still reports `Latch.Trigger` alone, which is a table, in the right place,
    // one row short.
    expect(doc.components.map(component => component.name).sort()).toEqual([
      'Gate',
      'Latch.Root',
      'Latch.Trigger',
      'Stream',
    ]);
  });

  it('reads a `React.FC`\'s props and the defaults in its arrow', () => {
    const gate = doc.components.find(component => component.name === 'Gate');
    expect(gate?.props.map(prop => prop.name)).toEqual(['dir', 'isOpen']);
    expect(propNamed(gate, 'isOpen')?.default).toBe('true');
    expect(propNamed(gate, 'dir')?.default).toBe('"ltr"');
  });

  it('leaves a capitalised async helper that resolves to nothing renderable', () => {
    // The fix is an awaited-type test, not "callable and async". `SaveLatch`
    // resolves to `void`, which is not assignable to `ReactNode` — so the
    // widening stops here rather than documenting every capitalised async
    // helper's argument as a props table.
    expect(doc.components.map(component => component.name)).not.toContain('SaveLatch');
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
