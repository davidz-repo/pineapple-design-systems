// Compiler fixture for `../base.json` — input to this package's `typecheck`,
// not shipped and not imported by anything.
//
// `base.json` is otherwise referenced only from other workspaces' tsconfigs, so
// nothing proves it is even parseable until a consumer breaks. Compiling this
// file against it makes a malformed value or an unknown compiler option fail in
// *this* package, where the mistake was made.
//
// Deliberately plain ES2020: `base.json` sets `lib: ["ES2020"]` with no DOM, so
// a stray DOM global here would be a fixture bug, not a config bug.

export interface ThemePreference {
  readonly name: string;
  readonly isDark: boolean;
}

/** Exercises `strict`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`. */
export function describeTheme(preference: ThemePreference): string {
  const suffix = preference.isDark ? 'dark' : 'light';
  return `${preference.name}:${suffix}`;
}
