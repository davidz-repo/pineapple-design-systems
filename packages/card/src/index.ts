// Public surface of @pineappleui/card.
// Thin indirection over @radix-ui/themes' Card — same props, same behavior,
// but consumers import from `@pineappleui/card` so future extensions ship
// transparently and the registry surface stays stable.

export { Card, type CardProps } from './Card';
