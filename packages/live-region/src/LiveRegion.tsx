import type { ElementType, ReactNode } from 'react';

/**
 * LiveRegion — an audited `aria-live` announcement wrapper.
 *
 * One primitive for every screen-reader announcement region, so the a11y decisions
 * (politeness, atomicity, keeping the region MOUNTED with changing text rather than
 * mounting/unmounting whole regions) live in one reviewed place instead of being
 * hand-rolled per feature.
 *
 * Usage notes (the contract callers must uphold):
 * - Keep the region mounted and swap its CHILDREN; a region that mounts already-filled
 *   is not reliably announced by screen readers.
 * - One region per independent announcement stream — two streams sharing a region
 *   coalesce and double- or mis-announce (e.g. an app announcing connection status,
 *   form-validation errors and live captions keeps all three in separate regions).
 * - `atomic` re-announces the whole content on any change (use for captions-style text
 *   that is rewritten in place); leave it off for append-style streams.
 */
export interface LiveRegionProps {
  children?: ReactNode;
  /** `polite` (default) waits for a pause; `assertive` interrupts — use sparingly. */
  politeness?: 'polite' | 'assertive';
  /** Announce the region's full content on any change, not just the delta. */
  atomic?: boolean;
  /** Rendered element (default `div`). */
  as?: ElementType;
  /** Optional `role` (e.g. `status`, which implies polite semantics for AT that maps it). */
  role?: string;
  className?: string;
  id?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  as: Tag = 'div',
  role,
  className,
  id,
}: LiveRegionProps) {
  return (
    <Tag
      aria-live={politeness}
      aria-atomic={atomic || undefined}
      role={role}
      className={className}
      id={id}
    >
      {children}
    </Tag>
  );
}
