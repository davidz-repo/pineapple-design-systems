// Public surface of @pineappleui/text-field.
// Thin indirection over @radix-ui/themes' TextField — same compound-component
// surface (TextField.Root, TextField.Slot), but consumers import from
// `@pineappleui/text-field` so future extensions ship transparently and the
// published surface stays stable.

export { TextField } from './TextField';
