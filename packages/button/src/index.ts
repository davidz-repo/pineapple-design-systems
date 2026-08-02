// Public surface of @pineappleui/button.
// Thin indirection over @radix-ui/themes' Button — same props, same behavior,
// but consumers import from `@pineappleui/button` so future extensions ship
// transparently and the registry surface stays stable.

export { Button, type ButtonProps } from './Button';
