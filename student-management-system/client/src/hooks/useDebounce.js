import { useEffect, useState } from 'react';

// Returns the value only after it has stopped changing for `delay` ms.
// Used for search boxes so we don't call the API on every key press.
export default function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
