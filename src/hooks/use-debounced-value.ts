import { useEffect, useState } from "react";

/** A history restoration bypasses the debounce and cancels pending edits. */
export function useDebouncedValue<T>(value: T, delay: number, revision = 0): T {
  const [settled, setSettled] = useState({ value, revision });

  useEffect(() => {
    if (settled.revision !== revision) {
      setSettled({ value, revision });
      return;
    }
    const timer = setTimeout(() => setSettled({ value, revision }), delay);
    return () => clearTimeout(timer);
  }, [value, delay, revision, settled.revision]);

  // The restoring render must already use the new URL's values. Waiting for
  // the effect would let URL synchronization write the previous search back.
  return settled.revision === revision ? settled.value : value;
}
