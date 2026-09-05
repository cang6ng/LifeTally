import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => void | Promise<void>,
  delay: number = 3000
) {
  const timeoutRef = useRef<number>();
  const previousValueRef = useRef<T>(value);

  const debouncedSave = useCallback(
    (currentValue: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        onSave(currentValue);
      }, delay);
    },
    [onSave, delay]
  );

  useEffect(() => {
    if (previousValueRef.current !== value) {
      debouncedSave(value);
      previousValueRef.current = value;
    }
  }, [value, debouncedSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
