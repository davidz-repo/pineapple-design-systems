// Public surface of @pineappleui/icons.
// A wrapper over Lucide with design-system size tokens + decorative-by-default
// a11y. App code imports `Icon` from here, never `lucide-react` directly.
//
// ICON_NAMES / ICON_SIZES are the vocabulary as values, for UIs that enumerate
// the set (a picker, a gallery) — a type cannot be iterated. The maps they are
// derived from stay internal.

export { Icon, type IconProps } from './Icon';
export { ICON_NAMES, ICON_SIZES, type IconName, type IconSize } from './vocabulary';
