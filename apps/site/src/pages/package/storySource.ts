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

// The tail of a declaration this can find: an export whose name starts a line.
const DECLARATION_KEYWORDS = 'function|const|let|class';

// Identifiers are `[A-Za-z0-9_$]`, and `$` is the one that also means something
// to a regex. Escaped rather than assumed away — the name comes from whatever
// the package exported.
const REGEXP_SPECIALS = /[$\\^*+?.()|[\]{}]/g;

/**
 * The source text of one exported story, comment block included, or `undefined`
 * when the file does not declare it at the top level.
 */
export function sourceOfExport(source: string, exportName: string): string | undefined {
  const name = exportName.replace(REGEXP_SPECIALS, '\\$&');
  const declaration = new RegExp(`^export (?:async )?(?:${DECLARATION_KEYWORDS}) ${name}\\b`, 'm');
  const found = declaration.exec(source);
  if (found === null) {
    return undefined;
  }

  // The next top-level `export` ends this one. Statements that belong to the
  // declaration and are not exports themselves — `Playground.args = {...}` —
  // stay with it, which is right: they are the story's arguments.
  const bodyStart = found.index + found[0].length;
  const nextExport = /^export\s/m.exec(source.slice(bodyStart));
  const end = nextExport === null ? source.length : bodyStart + nextExport.index;

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
