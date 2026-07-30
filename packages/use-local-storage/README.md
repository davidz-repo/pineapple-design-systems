# @pineappleui/use-local-storage

A React hook for [`@pineappleui`](https://github.com/davidz-repo/pineapple-design-systems) that
keeps a piece of state in sync with `localStorage` — read once on mount, written on every set.

```bash
npm install @pineappleui/use-local-storage
```

## What it exports

```ts
import { useLocalStorage } from '@pineappleui/use-local-storage';

const [accent, setAccent] = useLocalStorage<string>('accent', 'bronze');
```

| Export | What it is |
| --- | --- |
| `useLocalStorage<T>(key, initial)` | Returns `[value, set]`. Reads `key` on first render, falls back to `initial`, and writes JSON on every `set`. |

## The one package here that reads a browser global

`docs/plan.md` §1 says a package must not read from a global. This one does, deliberately: it
**is** the storage primitive. Wrapping `localStorage` is the whole point, and moving the read
out to a prop would leave nothing behind. It is on the roadmap as a decision, not an oversight —
every *other* package still takes its persisted value as a prop and calls back to change it.

## The contract

- **Serialization is JSON.** Values go through `JSON.stringify`/`JSON.parse`, so anything
  `JSON` cannot round-trip (a `Date`, a `Map`, a function) comes back as something else. Store
  plain data.
- **Read failures fall back, they do not throw.** A malformed stored value, a disabled storage
  API, or private-mode restrictions resolve to `initial` instead of crashing the render.
- **Write failures are ignored on purpose.** A quota or private-mode error must not break the
  UI: React state still updates, only the persistence is lost. This is the one place the
  package swallows an error, and it is the reason it can be called during render safely.
- **`initial` is read once.** It seeds the `useState` initializer; changing it on a later render
  does not overwrite what is already stored.
- **No cross-tab sync.** The hook does not subscribe to the `storage` event. Two tabs each keep
  their own React state, and last write wins on disk.

## Licence

MIT © David Zhang
