"use client";

import { useCallback, useEffect, useRef } from "react";

// Returns a stable function identity that always calls the latest callback.
export function useCallbackRef<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}
