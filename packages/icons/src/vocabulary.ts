// The icon vocabulary: what a `name` can be, what a `size` can be, and the
// runtime list of each. This is the file a new glyph is added to.
//
// It sits beside Icon.tsx rather than inside it because a module that exports a
// component may only export components — `react-refresh/only-export-components`,
// which keeps Fast Refresh working in the gallery. The maps stay internal; only
// the derived lists and the types are re-exported from index.ts.

import {
  ArrowLeftRight,
  Captions,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  House,
  Mic,
  MicOff,
  PhoneOff,
  X,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// Semantic name → Lucide glyph. Names are intent-based (not tied to the icon
// library), so the underlying set can be swapped without touching call sites.
// Add an entry here the first time a glyph is needed.
export const ICONS = {
  'arrow-left-right': ArrowLeftRight,
  'captions': Captions,
  'check': Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'close': X,
  'copy': Copy,
  'home': House,
  'mic': Mic,
  'mic-off': MicOff,
  'phone-off': PhoneOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

// Every glyph name, in declaration order, so a consumer can *enumerate* the set
// (an icon picker, a gallery) rather than hand-type it — a type cannot be
// iterated. Derived from ICONS, which stays the single definition site: a second
// hand-written list is a list that goes stale the first time a glyph is added,
// and nothing fails when it does.
export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];

// Design-system size tokens (px). `size` also accepts a raw number as an escape
// hatch for the rare off-scale case.
export const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} satisfies Record<string, number>;

export type IconSize = keyof typeof SIZES;

// The size tokens, smallest first — same derivation, same reason as ICON_NAMES.
export const ICON_SIZES = Object.keys(SIZES) as readonly IconSize[];
