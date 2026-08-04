import { REGISTRY } from '../../registry';

// The playground's snippet is copyable, so it has to compile where it lands:
// `<Button variant="soft">Click me</Button>` on its own pastes into a
// "Button is not defined". These import lines are what make it real code.
//
// Derived, never hand-written per entry: the registry already pairs each
// component's exported NAME with the package slug it ships from, so a new
// package's snippet gets its import the moment its registry entry lands, and
// a snippet that grows a second component (icon-button's `<Icon>` child) gets
// the second import without anyone remembering to add it.
const SPECIFIER_BY_COMPONENT: ReadonlyMap<string, string> = new Map(
  REGISTRY.map(entry => [entry.name, `@pineappleui/${entry.slug}`]),
);

// The root identifier of every JSX opening tag: `Button` from `<Button …>`,
// and `TextField` from `<TextField.Root …>` — the namespace is what you
// import, not the member. Lowercase host tags (the `<span>` the icons snippet
// wraps its glyph in) never match, and neither does a capitalised name this
// design system does not ship.
const OPENING_TAG = /<([A-Z]\w*)/g;

/**
 * The import lines a snippet needs — one per package, each naming every
 * component the snippet takes from it, ordered by specifier.
 */
export function deriveImportLines(jsx: string): string[] {
  const namesBySpecifier = new Map<string, Set<string>>();

  for (const [, component] of jsx.matchAll(OPENING_TAG)) {
    const specifier = SPECIFIER_BY_COMPONENT.get(component);
    if (specifier === undefined) {
      continue;
    }
    const names = namesBySpecifier.get(specifier) ?? new Set<string>();
    names.add(component);
    namesBySpecifier.set(specifier, names);
  }

  return [...namesBySpecifier]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([specifier, names]) => `import { ${[...names].sort().join(', ')} } from '${specifier}';`);
}

/**
 * The snippet as you would paste it: the imports, a blank line, then the JSX.
 * A snippet that references nothing importable is returned untouched.
 */
export function prependImports(jsx: string): string {
  const lines = deriveImportLines(jsx);
  return lines.length === 0 ? jsx : `${lines.join('\n')}\n\n${jsx}`;
}
