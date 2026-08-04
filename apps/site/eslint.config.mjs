import pineapple from '@pineappleui/eslint-config';

export default pineapple({
  // `vite build` writes apps/site/dist/, and `eslint .` would otherwise lint
  // the bundle it just emitted. The repo-root .gitignore does exclude it, but
  // ESLint's gitignore integration reads that file relative to this workspace,
  // where the pattern `**/dist/` matches nothing until a build has run and
  // then matches generated code only. Stated here so the ignore does not
  // depend on which .gitignore is in scope.
  ignores: ['dist'],
  typescript: { tsconfigPath: 'tsconfig.json' },
});
