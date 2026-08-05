/* eslint-disable react-refresh/only-export-components -- the export here is an
   OBJECT of components, which is exactly the shape being tested; the rule reads
   that as a module exporting non-components. Nothing here is ever mounted, so
   there is no fast-refresh boundary for it to protect. */

// A compound component, the shape `@pineappleui/text-field` ships: one export
// that is an object of components rather than a component. The extractor
// descends one level into it, and has to take the members that are components
// and leave the ones that are not.
//
// Written the way this repo would write one — named functions collected into an
// object — rather than the way Radix's build emits one, so the defaults are
// where a reader of THIS repo would put them: in the destructuring parameter of
// a function the object only references.

export interface PanelRootProps {
  /** Whether the panel is open. */
  isOpen?: boolean;
  /** What the panel is called. */
  title: string;
}

function PanelRoot({ isOpen = true, title }: PanelRootProps) {
  return <div hidden={!isOpen}>{title}</div>;
}

export interface PanelSlotProps {
  /** Which edge the slot sits on. */
  side?: 'left' | 'right';
}

function PanelSlot({ side = 'left' }: PanelSlotProps) {
  return <span data-side={side} />;
}

export const Panel = {
  Root: PanelRoot,
  Slot: PanelSlot,
  /** Capitalised and not callable: a member, not a component. */
  DEFAULT_SIDE: 'left',
};
