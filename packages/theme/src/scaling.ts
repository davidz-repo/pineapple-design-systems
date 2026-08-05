import type { ComponentProps } from 'react';

import type { Theme } from '@radix-ui/themes';

/**
 * Radix's own scale steps, derived from `<Theme>` rather than hand-typed.
 *
 * Every Radix space and font token multiplies by this, so it is the one dial
 * that makes a whole app read larger or smaller without touching a single
 * `size` prop — and without changing any ratio, which per-component bumps do.
 *
 * A literal union copied out of Radix's types would be the same mistake as the
 * hand-typed accent list that shipped `bronze` at every surface except first
 * paint: correct until Radix adds a step, and silent when it does.
 */
export type Scaling = NonNullable<ComponentProps<typeof Theme>['scaling']>;

/**
 * What `<Theme>` uses when given no `scaling`, restated here because BOTH
 * surfaces that paint the theme have to agree on it and neither can read
 * Radix's default at runtime — the boot script writes an attribute string
 * before any module loads, and an omitted prop is not a value it can serialize.
 */
export const DEFAULT_SCALING: Scaling = '100%';
