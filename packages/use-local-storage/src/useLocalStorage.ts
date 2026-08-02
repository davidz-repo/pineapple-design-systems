import { useRef, useState } from 'react';

/**
 * What `set` accepts: a value, or a function receiving the LATEST stored value
 * and returning the next one — `useState`'s own two shapes, for the same reason
 * `useState` has both.
 *
 * A caller that spreads the current value (`set({ ...value, appearance })`)
 * spreads the one its render captured, so two `set` calls in the same tick each
 * start from that same snapshot and the second overwrites the first. The
 * updater form is what makes them compose.
 */
export type SetStoredValue<T> = T | ((previous: T) => T);

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (value: SetStoredValue<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    }
    catch {
      return initial;
    }
  });

  // The value an updater is resolved against. React's own state is not readable
  // synchronously between two `set` calls in one tick — `value` is the render's
  // snapshot, and that snapshot is exactly what the caller could already see. A
  // ref is written on every `set`, so the second call in a tick resolves against
  // what the first one produced rather than against the render before both.
  //
  // Nothing else writes the state, so the two cannot drift apart.
  const storedValueRef = useRef(value);

  function set(next: SetStoredValue<T>) {
    // `typeof next === 'function'` is the same test React makes, and it carries
    // the same caveat: a T that is ITSELF a function cannot be stored by passing
    // it directly — pass `() => theFunction` instead.
    const resolved = typeof next === 'function'
      ? (next as (previous: T) => T)(storedValueRef.current)
      : next;

    storedValueRef.current = resolved;
    setValue(resolved);
    try {
      localStorage.setItem(key, JSON.stringify(resolved));
    }
    catch {
      // ignore quota / private-mode errors
    }
  }

  return [value, set];
}
