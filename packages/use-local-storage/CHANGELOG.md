# @pineappleui/use-local-storage

## 0.2.0

### Minor Changes

- [#25](https://github.com/davidz-repo/pineapple-design-systems/pull/25) [`d0aac15`](https://github.com/davidz-repo/pineapple-design-systems/commit/d0aac15294e0f6bc8c101d5005e21c948f58ced4) Thanks [@davidz-repo](https://github.com/davidz-repo)! - `set` now accepts a functional updater as well as a value — `set(previous => next)` alongside
  `set(next)`, which is `useState`'s own pair of shapes. Additive: every existing call keeps
  working unchanged, and the new `SetStoredValue<T>` type is exported for callers that want to
  name it.

  It exists because the value form alone cannot express two writes in one tick. A caller deriving
  the next value from the current one spreads the value its _render_ captured, so two `set` calls
  before the next render each start from that same snapshot and the second silently drops the
  first — the shape of "I set two preferences and only the last one stuck". An updater is handed
  what the call before it produced, so the two compose.

  The caveat is React's, and it comes with the shape: a `T` that is itself a function cannot be
  stored by passing it directly, because that is read as an updater. Pass `() => theFunction`.

## 0.1.0

### Minor Changes

- [#10](https://github.com/davidz-repo/pineapple-design-systems/pull/10) [`98ed0cf`](https://github.com/davidz-repo/pineapple-design-systems/commit/98ed0cf7c3f96c283bac389a8e9dcbc27e748a96) Thanks [@davidz-repo](https://github.com/davidz-repo)! - First public release of `@pineappleui/use-local-storage`, `@pineappleui/live-region` and
  `@pineappleui/icons` — the three Phase 1 packages, none of which depends on another `@pineappleui`
  package. `use-local-storage` is the hook that syncs a piece of state to `localStorage`;
  `live-region` is the audited `aria-live` announcement wrapper; `icons` is the Lucide wrapper with
  design-system size tokens and decorative-by-default a11y, and ships `lucide-react` as its one
  runtime dependency. React is a peer everywhere. Ported from the private monorepo they grew in, with
  the scope renamed and the publish contract (public access, MIT licence, `dist/`-rooted entry points)
  applied.
