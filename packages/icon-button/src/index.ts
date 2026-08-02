// Public surface of @pineappleui/icon-button.
// Thin indirection over @radix-ui/themes' IconButton — same props, same
// behavior, but consumers import from `@pineappleui/icon-button` so future
// extensions ship transparently and the registry surface stays stable.

export { IconButton, type IconButtonProps } from './IconButton';
