import pineapple from '@pineappleui/eslint-config';

export default pineapple({
  // `ladle build` writes apps/gallery/build/, and `eslint .` would otherwise
  // lint the bundle it just emitted — ~96k errors, and a lint result that
  // depends on whether a build happened to run first. The repo-root .gitignore
  // does exclude it, but ESLint's gitignore integration reads that file
  // relative to this workspace, where the pattern `apps/*/build/` matches
  // nothing. Stated here so the ignore does not depend on which .gitignore is
  // in scope.
  ignores: ['build'],
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
});
