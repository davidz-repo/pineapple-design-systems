import { useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    }
    catch {
      return initial;
    }
  });

  function set(newValue: T) {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    }
    catch {
      // ignore quota / private-mode errors
    }
  }

  return [value, set];
}
