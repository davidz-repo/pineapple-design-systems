// Lints the root's own JavaScript — the guards in `scripts/` and this file.
//
// `react` and `typescript` are off: everything here is plain Node ESM with no
// JSX, and the root carries no `tsconfig.json` for the TS parser to point at.
// Same shape as `packages/eslint-config`'s own config, which lints an ESM
// package for the same reasons.
//
// This config has no `lint` script of its own in the turbo graph — the root is
// not a workspace. It runs as the root task `//#lint:scripts`, which `lint`
// declares in `dependsOn`, so the single `turbo run build lint test typecheck`
// that CI and `verify` already run covers `scripts/` with no list to extend.
import pineapple from '@pineappleui/eslint-config';

export default pineapple({
  react: false,
  typescript: false,
}).append({
  // Every guard here hand-writes a reader for a file the repo owns — a
  // workflow, a manifest, a source tree — and each pattern is spelled out
  // beside prose that says exactly what it must and must not match. These four
  // rules all ask for the pattern to be rewritten, and the set a guard's regex
  // matches is the guard's contract: narrowing or widening it by a character is
  // the one change that cannot be made here for style. The backtracking two of
  // them price in needs an input nobody can supply — there is no user text on
  // this path.
  files: ['scripts/**'],
  rules: {
    'regexp/no-contradiction-with-assertion': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'regexp/prefer-character-class': 'off',
    'regexp/use-ignore-case': 'off',
  },
});
