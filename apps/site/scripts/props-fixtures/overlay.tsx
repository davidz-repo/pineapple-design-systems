import type { ComponentPropsWithRef } from 'react';

import { Flex } from '@radix-ui/themes';

// A fixture for extract-props.test.mjs, not a component anybody renders. It is
// the shape every wrapper package in this repo is written in — an INSTALLED
// prop surface intersected with a block that re-states a prop purely to hang a
// description on it — and it is the one fixture that deliberately reaches into
// node_modules, because the failure it pins is about WHOSE declaration a
// sentence came from.
//
// `Symbol.getDocumentationComment` concatenates across declarations, upstream
// first. So a prop documented in both places used to come out as two
// run-together sentences, and the day @radix-ui/themes starts documenting one
// of the props the seven wrappers re-state, 33 table cells would have silently
// become that — under a README saying the words are the package's.
//
// `gap` is the one restated here because Radix documents it AND this repo does
// not override it (unlike `gapX`/`gapY`, which UPSTREAM_CORRECTIONS replaces
// outright, so they could not tell the two mechanisms apart). `justify` is left
// alone beside it, so the same fixture also proves upstream's JSDoc is in this
// program at all — without that, "the local sentence wins" would pass just as
// well over a program where there was nothing to lose to.

type FlexProps = ComponentPropsWithRef<typeof Flex>;

export type PanelProps = FlexProps & {
  /** The package's own words for a prop the library underneath also documents. */
  gap?: FlexProps['gap'];
};

/** A panel. Its own description, so the extractor has one to pick up. */
export function Panel(props: PanelProps) {
  return <Flex {...props} />;
}
