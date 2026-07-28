// This package lints itself with itself.
//
// `react` and `typescript` are off: this package is plain ESM JavaScript with
// no JSX and no `tsconfig.json`. Leaving `typescript: true` (the factory
// default) would point the TS parser at a tsconfig that does not exist here.
import pineapple from './index.mjs';

export default pineapple({
  react: false,
  typescript: false,
});
