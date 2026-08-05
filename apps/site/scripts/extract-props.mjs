// Props extraction, on the TypeScript compiler API and nothing else.
//
// The site's Props tables are generated from each package's own types rather
// than written by hand, for the same reason its overviews are the packages'
// READMEs: a table somebody maintains beside the source is a table that is
// wrong the first week nobody remembers to. react-docgen-typescript, typedoc
// and ts-morph were each evaluated and rejected — the repo already depends on
// `typescript`, and everything below is `getPropertiesOfType` plus four
// decisions about what to do with the result.
//
// WHAT IS A COMPONENT
//
// An export is a component when its name starts with a capital (React's own
// rule for what JSX may name), its type is callable with at most one argument,
// and some call signature returns something assignable to `ReactNode` — the
// real type, resolved out of the program's own `@types/react`, not a name
// matched as text. The three together are what keep `ICON_NAMES.concat` out:
// an array method is callable and returns an array, and a predicate written on
// callability alone documented `Array.prototype` as a component.
//
// One more, for the same reason from the other side: an export whose argument
// is a PRIMITIVE is not a component either. `ReactNode` includes `string |
// number | boolean`, so `export function Rem(px: number): string` passes all
// three tests above, and the props of a `number` are `toFixed` and friends —
// a wrong table rather than no table, which is worse.
//
// A namespace export is descended into one level, because `text-field` ships
// one: `TextField` is Radix's compound component re-exported whole, and
// `TextField.Root` / `TextField.Slot` are the things with props. Only members
// that are themselves components are taken, by the same predicate.
//
// WHICH PROPS ARE DOCUMENTED
//
// Every prop whose declaration is NOT in `@types/react`. A pass-through
// wrapper's props type resolves to a few hundred properties — 311 for
// `TextField.Root` — and ~95% of them are the standard DOM attributes React
// declares for every `<input>`: `placeholder`, `onKeyDown`, `aria-*`. Those are
// documented by MDN, they are identical on every component here, and a table
// holding them is a table nobody reads. What is left is what the design system
// and the primitive underneath it actually declare, which is the question a
// props table is opened with. The page says so in a sentence rather than
// leaving the omission silent.
//
// `ref` and `children` are dropped by name on top of that: both are React
// mechanics rather than props of this component, both appear on nearly every
// row, and `children`'s type (`ReactNode`) says nothing a reader did not
// already know. `key` goes with them for the same reason.
//
// LAYOUT PROPS ARE SPLIT OUT
//
// Radix Themes gives every component the same margin/padding/size/position
// props, declared in its shared `props/` modules rather than beside the
// component. That is 41 of `Box`'s 44 and 41 of `Stack`'s 51 — enough to bury
// `direction` in a list a reader has to scroll past. They are marked here and
// the page puts them behind a disclosure, which is what Radix's own docs do.
// The mark is a path test (see `SHARED_PROP_MODULES`), so if Radix ever moves
// those files every prop lands in the main table: a longer table, never a wrong
// one — and `generate-props.mjs` refuses on a run that classified none, so the
// degradation is loud rather than silent.
//
// DEFAULTS
//
// Two sources, because there are two kinds of default here:
//
//   - the package's own, written in the implementation's destructuring
//     parameter (`{ direction = 'column' }`), read off the AST;
//   - Radix's, which survive into its `.d.ts` as literal TYPES — its prop defs
//     are `as const`, so `size: { …, default: "2" }` is in the published types
//     and the checker hands it over. A `default` whose type is a union rather
//     than a literal is Radix saying "no default of its own" (the union is the
//     prop's own value type), so only single literals are taken.
//
// Anything else is left blank rather than guessed at.

import path from 'node:path';

/**
 * @typedef {object} PropDoc
 * @property {string} name the prop as it is written at a call site
 * @property {string} type rendered by the checker, `| undefined` trimmed
 * @property {boolean} required whether a call site has to pass it
 * @property {string} [default] a JS literal, quoted the way the page prints it
 * @property {string} description JSDoc as plain text — whitespace collapsed and
 * markdown markers stripped; `''` when there is none
 * @property {boolean} isLayout declared by the primitive's shared layout props
 */

/**
 * @typedef {object} ComponentDoc
 * @property {string} name `Button`, or `TextField.Root` for a namespace member
 * @property {string} description the component's own JSDoc, as plain text
 * @property {PropDoc[]} props required first, then alphabetical
 */

/**
 * @typedef {object} PackagePropsDoc
 * @property {string} slug the package directory this describes
 * @property {ComponentDoc[]} components every component it exports, in export order
 */

// Paths below are matched against `SourceFile.fileName`, which TypeScript
// normalises to forward slashes on every platform — so these are written that
// way rather than with `path.sep`.

/** Props React declares for every DOM element — documented by MDN, not here. */
const REACT_TYPES_DIR = '/@types/react/';

/**
 * Radix Themes' SHARED prop modules — `props/margin.props.d.ts`,
 * `props/layout.props.d.ts` and friends — as opposed to `components/*.props.d.ts`,
 * which is a component's own. Everything declared here is a prop every Radix
 * component takes.
 */
const SHARED_PROP_MODULES = /@radix-ui\/themes\/dist\/[^/]+\/props\//;

/** React mechanics rather than props of the component — see the header. */
const CARVED_OUT = new Set(['ref', 'children', 'key']);

/**
 * The two descriptions in the upstream types that are WRONG, corrected on the
 * way out — and the only two, deliberately.
 *
 * `node_modules/@radix-ui/themes/dist/esm/props/gap.props.d.ts` documents
 * `gapX` as "Sets the CSS **row-gap** property" while declaring
 * `customProperties: ["--column-gap"]`, and documents `gapY` as column-gap
 * while declaring `--row-gap`. The implementations are right and the prose is
 * swapped; upstream's own `@link` lines point at the same wrong MDN pages. On
 * `Stack` and `Inline` these are OWN props, in the default table, so a reader
 * who trusts the site is told the horizontal and vertical gaps are the other
 * way round — under this design system's name, since the page does not say
 * whose sentence it is.
 *
 * A list of two, matched on the prop name AND the module that declares it, so
 * it cannot quietly start correcting some other package's `gapX`. It is not a
 * general mechanism for editing third-party prose: whether the site should
 * republish Radix's descriptions at all is an open question, and this answers
 * only "not while two of them are false".
 *
 * If Radix fixes or moves these, the match stops firing and
 * `extract-props.test.mjs` says so — the assertion is on the corrected text.
 */
const UPSTREAM_CORRECTIONS = [
  {
    module: /@radix-ui\/themes\/dist\/[^/]+\/props\/gap\.props\.d\.ts$/,
    name: 'gapX',
    description: 'Sets the CSS column-gap property. Supports space scale values, CSS strings, '
      + 'and responsive objects.',
  },
  {
    module: /@radix-ui\/themes\/dist\/[^/]+\/props\/gap\.props\.d\.ts$/,
    name: 'gapY',
    description: 'Sets the CSS row-gap property. Supports space scale values, CSS strings, '
      + 'and responsive objects.',
  },
];

/**
 * @param {import('typescript').Symbol} prop
 * @returns {string|undefined} the corrected description, when this prop is one
 * of the two above; `undefined` for every other prop in the repo
 */
function correctedDescription(prop) {
  const declaredIn = (prop.declarations ?? []).map(
    declaration => declaration.getSourceFile().fileName,
  );
  return UPSTREAM_CORRECTIONS.find(
    correction => correction.name === prop.getName()
      && declaredIn.some(fileName => correction.module.test(fileName)),
  )?.description;
}

/** A default this can print: one string, number or boolean literal. */
const LITERAL = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)$/;

/**
 * The literal `node` spells, normalised to the JSON the page prints —
 * `'md'` and `"md"` are the same default written in two files' quoting
 * conventions, and a table that shows both is a table that looks inconsistent
 * about something that is not.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').Node} node
 * @returns {string|undefined} `undefined` for anything that is not a single literal
 */
function literalText(ts, node) {
  const text = node.getText();
  if (!LITERAL.test(text)) {
    return undefined;
  }
  if (text.startsWith('\'') || text.startsWith('"')) {
    return JSON.stringify(text.slice(1, -1).replace(/\\(.)/g, '$1'));
  }
  return text;
}

/**
 * The defaults a component writes into its own signature:
 * `function Stack({ direction = 'column', ...rest })`. Read from the
 * implementation, which is the only place they exist — a default parameter
 * leaves no trace in the props TYPE, so `direction?: 'column' | 'column-reverse'`
 * is all the checker can say about it.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} symbol the component
 * @returns {Map<string, string>} prop name -> literal default
 */
function destructuredDefaults(ts, checker, symbol) {
  /** @type {Map<string, string>} */
  const defaults = new Map();

  for (const declaration of implementationsOf(ts, checker, symbol)) {
    const fn = functionOf(ts, declaration);
    const parameter = fn?.parameters[0];
    if (parameter === undefined || !ts.isObjectBindingPattern(parameter.name)) {
      continue;
    }
    for (const element of parameter.name.elements) {
      if (element.initializer === undefined) {
        continue;
      }
      const value = literalText(ts, element.initializer);
      if (value !== undefined) {
        defaults.set((element.propertyName ?? element.name).getText(), value);
      }
    }
  }

  return defaults;
}

/**
 * Where a component is actually WRITTEN, which is not always where its symbol
 * is declared. A member of a compound component (`export const Panel = { Root:
 * PanelRoot }`) has a property assignment for a declaration, and a property
 * assignment has no parameter list to read defaults out of — the function is
 * one identifier away. Resolving it is what keeps `Panel.Root`'s defaults from
 * silently going missing while `Panel`'s own are found.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} symbol
 * @returns {import('typescript').Declaration[]} the declarations to read a
 * parameter list out of
 */
function implementationsOf(ts, checker, symbol) {
  return (symbol.declarations ?? []).flatMap((declaration) => {
    if (ts.isPropertyAssignment(declaration) && ts.isIdentifier(declaration.initializer)) {
      return checker.getSymbolAtLocation(declaration.initializer)?.declarations ?? [];
    }
    return [declaration];
  });
}

/**
 * @param {import('typescript')} ts
 * @param {import('typescript').Declaration} declaration
 * @returns {import('typescript').SignatureDeclaration|undefined} the function
 * this declaration IS, or the one it is initialised with
 */
function functionOf(ts, declaration) {
  if (ts.isFunctionDeclaration(declaration)
    || ts.isArrowFunction(declaration)
    || ts.isFunctionExpression(declaration)) {
    return declaration;
  }
  const initializer = (ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration))
    ? declaration.initializer
    : undefined;
  if (initializer === undefined) {
    return undefined;
  }
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return initializer;
  }
  // `const Chip = forwardRef(function Chip({ tone = 'iris' }, ref) {…})`, and
  // `memo(...)` wrapped around that. The defaults are in there, one call deep,
  // and a lookup that stops at a direct function finds no parameter list at
  // all — so every Default cell on such a component goes blank while the props
  // themselves are all still found. Silent degradation, which is the one thing
  // the rest of this file refuses to do.
  return ts.isCallExpression(initializer) ? functionArgumentOf(ts, initializer) : undefined;
}

/**
 * @param {import('typescript')} ts
 * @param {import('typescript').CallExpression} call
 * @returns {import('typescript').SignatureDeclaration|undefined} the first
 * function this call is handed, looking through nested calls
 */
function functionArgumentOf(ts, call) {
  for (const argument of call.arguments) {
    if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
      return argument;
    }
    if (ts.isCallExpression(argument)) {
      const nested = functionArgumentOf(ts, argument);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
}

/**
 * The `default:` Radix's prop defs publish beside the prop.
 *
 * `GetPropDefTypes<typeof buttonPropDefs>` is a mapped type, and TypeScript
 * keeps each mapped property pointed at the declaration it was mapped FROM —
 * the `size: { type: 'enum'; …; default: "2" }` member of the prop-def object.
 * So the default is one hop from the property symbol, in the published `.d.ts`,
 * with no need to find and resolve the prop-def object separately.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').Symbol} prop
 * @returns {string|undefined} the literal Radix declares, if it declares one
 */
function propDefDefault(ts, prop) {
  for (const declaration of prop.declarations ?? []) {
    if (!ts.isPropertySignature(declaration)
      || declaration.type === undefined
      || !ts.isTypeLiteralNode(declaration.type)) {
      continue;
    }
    const member = declaration.type.members.find(
      candidate => candidate.name !== undefined && candidate.name.getText() === 'default',
    );
    if (member === undefined || member.type === undefined) {
      continue;
    }
    const value = literalText(ts, member.type);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * The type as the table prints it.
 *
 * Mostly the checker's own rendering, with `| undefined` trimmed — an optional
 * prop's cell says so through the Default column and the absence of a Required
 * badge, and `| undefined` on every second row is noise.
 *
 * The one thing it does itself is expand a union of STRING or NUMBER literals
 * into its members, rather than printing the alias the author gave it.
 * `tone?: Tone` is a cell a reader cannot use — the values are the answer, and
 * they are one hop away in a file they would have to go and find. The rule
 * stops at literals on purpose: `Responsive<"1" | "2" | "3">` is a union too,
 * and expanding it prints Radix's whole breakpoint object where the alias was
 * saying the useful thing. `boolean` is excluded by the same line — it is
 * `true | false` inside, and nobody wants to read that.
 *
 * Members come out in the order the union DECLARES them, which is both more
 * useful (`"none" | "small" | "medium" | "large"` is a scale) and more stable
 * than the checker's printer, whose order follows program-global type ids.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Type} type
 * @param {import('typescript').Node} enclosing where the type is being printed
 * @returns {string} the cell's text
 */
function typeText(ts, checker, type, enclosing) {
  const flags = ts.TypeFormatFlags.NoTruncation
    | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
  const LITERAL_FLAGS = ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral;

  if (type.isUnion()) {
    const members = type.types.filter(member => (member.flags & ts.TypeFlags.Undefined) === 0);
    if (members.length > 0 && members.every(member => (member.flags & LITERAL_FLAGS) !== 0)) {
      return members.map(member => checker.typeToString(member, enclosing, flags)).join(' | ');
    }
  }

  return checker.typeToString(type, enclosing, flags).replace(/\s*\|\s*undefined$/, '');
}

/**
 * A tsconfig's compiler options, resolved against its own directory.
 *
 * Exported so the generator and its unit test compile against the same options
 * — the site's, whose fenced `paths` map every `@pineappleui/*` to its source.
 * A test that restated them would be testing an extraction nothing runs.
 *
 * @param {import('typescript')} ts
 * @param {string} tsconfigPath absolute
 * @returns {import('typescript').CompilerOptions} the options that file resolves to
 */
export function readCompilerOptions(ts, tsconfigPath) {
  const { config, error } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (error !== undefined) {
    throw new Error(
      `extract-props: could not read ${tsconfigPath}: ${
        ts.flattenDiagnosticMessageText(error.messageText, ' ')}`,
    );
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfigPath)).options;
}

/**
 * Every package's components and their props, from one program over every
 * entry point — one `createProgram` rather than sixteen, because the packages
 * share almost every `.d.ts` they read and the checker can share them too.
 *
 * @param {object} input
 * @param {import('typescript')} input.ts the compiler, passed in so this module
 * takes no import of its own and a caller can hand it the one it resolved
 * @param {{ slug: string, entry: string }[]} input.entries absolute entry paths
 * @param {import('typescript').CompilerOptions} input.compilerOptions
 * @returns {{ docs: PackagePropsDoc[], diagnostics: import('typescript').Diagnostic[] }}
 * `diagnostics` holds the errors in the entries' OWN sources; a caller decides
 * what to do with them, because "these types do not compile" is a different
 * failure from "this extraction found nothing"
 */
export function extractPackageProps({ ts, entries, compilerOptions }) {
  const program = ts.createProgram({
    rootNames: entries.map(entry => entry.entry),
    options: { ...compilerOptions, noEmit: true, declaration: false, declarationMap: false },
  });
  const checker = program.getTypeChecker();

  const reactNode = resolveReactNode(ts, program, checker);
  if (reactNode === undefined) {
    throw new Error(
      'extract-props: could not resolve React\'s `ReactNode` out of the program, so it has no '
      + 'way to tell a component from any other callable export. Check that @types/react is '
      + 'installed and reachable from the compiler options passed in — the predicate is '
      + 'deliberately the real type rather than a name matched as text.',
    );
  }

  const ownSources = entries.map(entry => path.dirname(entry.entry));
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(
    diagnostic => diagnostic.category === ts.DiagnosticCategory.Error
      && diagnostic.file !== undefined
      && ownSources.some(dir => diagnostic.file.fileName.startsWith(dir)),
  );

  // A props type nothing has props: `ReactNode` includes `string | number |
  // boolean`, so a capitalised helper like `export function Rem(px: number):
  // string` satisfies "callable with one argument, returns a ReactNode" and
  // gets taken for a component. Its props are then `getPropertiesOfType` of a
  // `number` — the APPARENT type's members — and `Rem` ships a table of
  // `toExponential`, `toFixed`, `toPrecision`, `valueOf`. A wrong table, not a
  // missing one, on a page that looks confident. Same class as the
  // `Array.prototype` bug in the header: the capitalisation check closed the
  // route in through the return type, and this is the one through the
  // parameter.
  const PRIMITIVE_PROPS = ts.TypeFlags.StringLike
    | ts.TypeFlags.NumberLike
    | ts.TypeFlags.BooleanLike
    | ts.TypeFlags.BigIntLike
    | ts.TypeFlags.ESSymbolLike;

  /**
   * Whether this export is a component, and what its props type is — the two
   * answers are one lookup, and they are different answers: a component
   * declared to take no argument at all is a component with no props, not a
   * non-component.
   *
   * @param {string} name
   * @param {import('typescript').Type} type
   * @returns {{ propsType: import('typescript').Type|undefined }|undefined}
   * `undefined` when this is not a component
   */
  function componentPropsType(name, type) {
    if (!/^[A-Z]/.test(name)) {
      return undefined;
    }
    for (const signature of checker.getSignaturesOfType(type, ts.SignatureKind.Call)) {
      const parameters = signature.getParameters();
      if (parameters.length > 1) {
        continue;
      }
      if (!checker.isTypeAssignableTo(checker.getReturnTypeOfSignature(signature), reactNode)) {
        continue;
      }
      const [parameter] = parameters;
      if (parameter === undefined) {
        // A component declared to take no argument at all — a component with
        // no props, not a non-component.
        return { propsType: undefined };
      }
      const propsType = checker.getTypeOfSymbol(parameter);
      if ((propsType.flags & PRIMITIVE_PROPS) !== 0) {
        continue;
      }
      return { propsType };
    }
    return undefined;
  }

  /**
   * @param {import('typescript').Symbol} component
   * @param {import('typescript').Type|undefined} propsType
   * @returns {PropDoc[]} the documented props, ordered for the table
   */
  function propsOf(component, propsType) {
    if (propsType === undefined) {
      return [];
    }
    const defaults = destructuredDefaults(ts, checker, component);
    /** @type {PropDoc[]} */
    const props = [];

    for (const prop of checker.getPropertiesOfType(propsType)) {
      const name = prop.getName();
      if (CARVED_OUT.has(name)) {
        continue;
      }
      // The first declaration that is not React's own DOM attributes: a prop
      // Radix narrows (`TextField.Root`'s `type`) is declared in both places,
      // and the narrowing is the half worth printing.
      const declaration = (prop.declarations ?? []).find(
        candidate => !candidate.getSourceFile().fileName.includes(REACT_TYPES_DIR),
      );
      if (declaration === undefined) {
        continue;
      }

      props.push({
        name,
        type: typeText(
          ts,
          checker,
          checker.getTypeOfSymbolAtLocation(prop, declaration),
          declaration,
        ),
        required: (prop.flags & ts.SymbolFlags.Optional) === 0,
        ...pickDefault(defaults.get(name) ?? propDefDefault(ts, prop)),
        description: correctedDescription(prop)
          ?? plainText(ts.displayPartsToString(prop.getDocumentationComment(checker))),
        isLayout: SHARED_PROP_MODULES.test(declaration.getSourceFile().fileName),
      });
    }

    // Required first — they are the props a reader has to pass — then
    // alphabetical by code point, so the artifact is byte-identical on every
    // machine that builds it.
    return props.sort(
      (a, b) => Number(b.required) - Number(a.required)
        || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    );
  }

  /** @type {PackagePropsDoc[]} */
  const docs = [];

  for (const { slug, entry } of entries) {
    const file = program.getSourceFile(entry);
    const moduleSymbol = file === undefined ? undefined : checker.getSymbolAtLocation(file);
    if (moduleSymbol === undefined) {
      docs.push({ slug, components: [] });
      continue;
    }

    /** @type {ComponentDoc[]} */
    const components = [];

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = aliasedSymbol(ts, checker, exported);
      if ((symbol.flags & ts.SymbolFlags.Value) === 0) {
        continue;
      }
      const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration ?? file);
      const name = exported.getName();

      const component = componentPropsType(name, type);
      if (component !== undefined) {
        components.push({
          name,
          description: plainText(ts.displayPartsToString(symbol.getDocumentationComment(checker))),
          props: propsOf(symbol, component.propsType),
        });
        continue;
      }

      // One level of namespace: `TextField.Root`, `TextField.Slot`. Only under
      // a capitalised export, so an exported array or record of functions is
      // not walked looking for components inside it.
      if (!/^[A-Z]/.test(name)) {
        continue;
      }
      for (const member of checker.getPropertiesOfType(type)) {
        const memberSymbol = aliasedSymbol(ts, checker, member);
        const memberType = checker.getTypeOfSymbolAtLocation(
          memberSymbol,
          memberSymbol.valueDeclaration ?? file,
        );
        const memberComponent = componentPropsType(member.getName(), memberType);
        if (memberComponent === undefined) {
          continue;
        }
        components.push({
          name: `${name}.${member.getName()}`,
          description: plainText(
            ts.displayPartsToString(memberSymbol.getDocumentationComment(checker)),
          ),
          props: propsOf(memberSymbol, memberComponent.propsType),
        });
      }
    }

    docs.push({ slug, components });
  }

  return { docs, diagnostics };
}

/**
 * `default` is omitted rather than written as `undefined`, so the JSON says
 * "no default" by not carrying the key — the shape a reader of the file, and
 * the site's own optional field, both already mean by absence.
 *
 * @param {string|undefined} value
 * @returns {{ default?: string }} the field, or nothing to spread
 */
function pickDefault(value) {
  return value === undefined ? {} : { default: value };
}

/**
 * @param {import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} symbol
 * @returns {import('typescript').Symbol} what it aliases, or itself
 */
function aliasedSymbol(ts, checker, symbol) {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

/**
 * The inline markdown a JSDoc author writes and a table cell cannot render:
 * a code span, then strong, then plain emphasis. The delimiters go and the
 * words stay, so `**div**` reads as `div`.
 *
 * Emphasis requires a non-space character inside the delimiters — CommonMark's
 * flanking rule, approximated — so a lone `*` in prose is left alone rather
 * than pairing with the next one. `_underscores_` are deliberately not in the
 * list: half the identifiers a props description names contain one, and
 * stripping them would eat the word.
 */
const MARKDOWN_MARKERS = [
  /`+([^`]+)`+/g,
  /\*\*(?!\s)([^*]+)(?<!\s)\*\*/g,
  /\*(?!\s)([^*]+)(?<!\s)\*/g,
];

/**
 * JSDoc as one line of plain text.
 *
 * A description is a table cell here, so the line breaks an author wrote for a
 * source file are not the ones a cell wants — and neither are the markdown
 * markers. Radix writes its JSDoc in markdown (`Sets the CSS **display**
 * property`) and this repo's own writes identifiers as code spans; rendered
 * verbatim they are literal asterisks and backticks in the table. Stripping
 * beats rendering here because the contract this fills — `PropDoc.description`
 * in src/content.ts — is a string the page prints, and a markdown renderer
 * inside a table cell is a block-level formatter loose in a 4rem column.
 *
 * @param {string} text
 * @returns {string} the same words, on one line, with no markers
 */
function plainText(text) {
  return MARKDOWN_MARKERS
    .reduce((stripped, marker) => stripped.replace(marker, '$1'), text)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * React's `ReactNode`, resolved out of the program rather than named as text —
 * the component predicate rests on it, and a string match would go on
 * "working" against a type that no longer exists.
 *
 * @param {import('typescript')} ts
 * @param {import('typescript').Program} program
 * @param {import('typescript').TypeChecker} checker
 * @returns {import('typescript').Type|undefined} `undefined` when React's types
 * are not in the program at all
 */
function resolveReactNode(ts, program, checker) {
  const reactTypes = program.getSourceFiles().find(
    file => file.fileName.includes(REACT_TYPES_DIR) && file.fileName.endsWith('/index.d.ts'),
  );
  const module = reactTypes === undefined ? undefined : checker.getSymbolAtLocation(reactTypes);
  const symbol = module === undefined
    ? undefined
    : checker.getExportsOfModule(module).find(exported => exported.getName() === 'ReactNode');
  return symbol === undefined ? undefined : checker.getDeclaredTypeOfSymbol(symbol);
}
