/* eslint-disable react-refresh/only-export-components -- a component beside a
   thing that is not one is the subject here, and one export is an OBJECT of
   components; the rule reads both as a module exporting non-components. Nothing
   here is ever mounted, so there is no fast-refresh boundary to protect. */
import type { FC, ReactNode } from 'react';

// A fixture for extract-props.test.mjs. Its subject is the ONE shape the
// component predicate used to miss, and the reason it missed it is a fact about
// `@types/react@19` rather than about anything in this repo:
//
//   interface FunctionComponent<P> { (props: P): ReactNode | Promise<ReactNode>; }
//
// `ReactNode` already contains `Promise<AwaitedReactNode>`, and
// `AwaitedReactNode` is `ReactNode` MINUS that promise arm — so
// `Promise<ReactNode>` is not assignable to `Promise<AwaitedReactNode>`, and the
// union `FunctionComponent` returns is therefore not assignable to `ReactNode`.
// A predicate written as "returns something assignable to `ReactNode`" says no
// to every `React.FC` in the program.
//
// What made that expensive is where it lands. Radix declares `Root`, `Portal`
// and `Sub` as `React.FC` and its other members as `ForwardRefExoticComponent`,
// so a namespace re-exported whole documents MOST of its members — a props
// table that renders, in the right place, with rows missing and nothing failing.
// `check-props-coverage` cannot see it either: it fails a package on a BLANK
// cell, and there is no cell here to be blank.
//
// So `Latch` below is deliberately mixed. A predicate that takes only the plain
// function still produces a table, and only a test that counts the members
// notices. The two standalone exports pin the two arms of the union
// independently, and `SaveLatch` pins that the fix did not widen to "anything
// that returns a promise".

export interface GateProps {
  /** Whether the gate is open. */
  isOpen?: boolean;
  /** Which way its content reads. */
  dir?: 'ltr' | 'rtl';
}

/**
 * `React.FC`, written the way Radix's build emits it — the annotation is on the
 * const, so the call signature the predicate reads is `FunctionComponent`'s own
 * rather than one inferred from this arrow.
 */
export const Gate: FC<GateProps> = ({ isOpen = true, dir = 'ltr' }) => (
  <div hidden={!isOpen} dir={dir} />
);

export interface StreamProps {
  /** Which source to read. */
  from: string;
}

/**
 * The other arm of the same union, reached without `FunctionComponent`: an async
 * component returns `Promise<ReactNode>` directly. React 19 renders this; a
 * predicate that only knows the synchronous shape does not.
 */
export async function Stream({ from }: StreamProps): Promise<ReactNode> {
  return <span>{from}</span>;
}

/**
 * NOT a component, and the reason the fix is an awaited-type test rather than
 * "callable and async": `void` is not assignable to `ReactNode`, so this stays
 * out. Without this the predicate would take every capitalised async helper in
 * the program and document its argument.
 */
export async function SaveLatch(props: GateProps): Promise<void> {
  await Promise.resolve(props);
}

export interface LatchTriggerProps {
  /** What the trigger is called. */
  label: string;
}

function LatchTrigger({ label }: LatchTriggerProps) {
  return <button type="button">{label}</button>;
}

/**
 * The shape that costs a reader rows: a namespace whose members are declared two
 * different ways, exactly as Radix declares `DropdownMenu`. Miss the `React.FC`
 * half and `Latch` still ships a table — of `Trigger` alone.
 */
export const Latch = {
  Root: Gate,
  Trigger: LatchTrigger,
};
