// Public surface of @pineappleui/text.
// Thin indirection over @radix-ui/themes' Text — same props, same behavior,
// but consumers import from `@pineappleui/text` so future extensions ship
// transparently and the registry surface stays stable.

export { Text, type TextProps } from './Text';
