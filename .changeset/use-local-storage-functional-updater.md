---
"@pineappleui/use-local-storage": minor
---

`set` now accepts a functional updater as well as a value — `set(previous => next)` alongside
`set(next)`, which is `useState`'s own pair of shapes. Additive: every existing call keeps
working unchanged, and the new `SetStoredValue<T>` type is exported for callers that want to
name it.

It exists because the value form alone cannot express two writes in one tick. A caller deriving
the next value from the current one spreads the value its *render* captured, so two `set` calls
before the next render each start from that same snapshot and the second silently drops the
first — the shape of "I set two preferences and only the last one stuck". An updater is handed
what the call before it produced, so the two compose.

The caveat is React's, and it comes with the shape: a `T` that is itself a function cannot be
stored by passing it directly, because that is read as an updater. Pass `() => theFunction`.
