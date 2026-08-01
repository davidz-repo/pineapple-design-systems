// Public surface of @pineappleui/heading.
// Thin indirection over @radix-ui/themes' Heading — same props, same behavior,
// but consumers import from `@pineappleui/heading` so future extensions ship
// transparently and the registry surface stays stable.

export { Heading, type HeadingProps } from './Heading';
