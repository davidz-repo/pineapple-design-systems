// Cutting one story out of the file it lives in, by reading the text rather
// than parsing it.
//
// The alternative is a TypeScript parser in the site's bundle to recover
// something the compiler already threw away — the site imports stories as
// MODULES, and a module's exports have no source. A regex is honest about what
// it is: every story file in this repo is written the same way (top-level
// `export function Name` / `export const Name`, one blank line between), and
// the failure mode is `undefined`, which the disclosure treats as "no code to
// show" rather than showing something wrong.
//
// What it deliberately does not do: reformat, resolve imports, or turn the
// story into a snippet you can paste. What it shows is the file, which is the
// thing a reader can go and read next to the component it renders.

// The head of a declaration this can find: an export whose name starts a line.
const DECLARATION_KEYWORDS = 'function|const|let|class';

// What ENDS one: the next top-level declaration of ANY kind, exported or not.
// `^export` alone was not enough. A story file writes its Playground's arg type
// as a bare `interface PlaygroundArgs` between two stories, and an unexported
// declaration did not stop the slice — so the story above it was cut at the
// export BELOW the interface and its panel showed a type it does not use, plus
// the Ladle "Controls" comment introducing the story after it.
const NEXT_DECLARATION = new RegExp(
  `^(?:export|import|declare|abstract|async|interface|type|enum|namespace|${DECLARATION_KEYWORDS})\\b`,
  'm',
);

// Identifiers are `[A-Za-z0-9_$]`, and `$` is the one that also means something
// to a regex. Escaped rather than assumed away — the name comes from whatever
// the package exported.
const REGEXP_SPECIALS = /[$\\^*+?.()|[\]{}]/g;

/** Where the file declares `exportName` at the top level, if it does. */
function declarationOf(source: string, exportName: string): RegExpExecArray | null {
  const name = exportName.replace(REGEXP_SPECIALS, '\\$&');
  const declaration = new RegExp(`^export (?:async )?(?:${DECLARATION_KEYWORDS}) ${name}\\b`, 'm');
  return declaration.exec(source);
}

/**
 * The source text of one exported story, comment block included, or `undefined`
 * when the file does not declare it at the top level.
 */
export function sourceOfExport(source: string, exportName: string): string | undefined {
  const found = declarationOf(source, exportName);
  if (found === null) {
    return undefined;
  }

  // The next top-level declaration ends this one — and so does the comment
  // block written above THAT declaration, which introduces the next thing
  // rather than closing this one. Statements that belong to the declaration and
  // are not declarations themselves — `Playground.args = {...}` — stay with it,
  // which is right: they are the story's arguments.
  const bodyStart = found.index + found[0].length;
  const next = NEXT_DECLARATION.exec(source.slice(bodyStart));
  const end = next === null
    ? source.length
    : startOfLeadingComment(source, bodyStart + next.index);

  return source.slice(startOfLeadingComment(source, found.index), end).trimEnd();
}

/**
 * Where the `//` comment block immediately above `declarationStart` begins —
 * `declarationStart` itself when there is none. A blank line ends the block,
 * which is what keeps a file header out of the first story in the file while
 * keeping the note that explains a particular one.
 */
function startOfLeadingComment(source: string, declarationStart: number): number {
  // Ends with the newline before the declaration, so the last element is the
  // empty string on the declaration's own line.
  const lines = source.slice(0, declarationStart).split('\n');
  let start = declarationStart;
  for (let index = lines.length - 2; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.trimStart().startsWith('//')) {
      break;
    }
    start -= line.length + 1;
  }
  return start;
}
