import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query from React.
 *
 * useSyncExternalStore is the correct primitive here (not useState +
 * useEffect): it reads the value during render, so the FIRST paint already
 * has the right answer. The useEffect version renders desktop columns for
 * one frame on mobile, then snaps — a visible flash.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false, // server snapshot; harmless for a pure SPA
  );
}

export const MOBILE_BREAKPOINT = '(max-width: 768px)';

export const useIsMobile = () => useMediaQuery(MOBILE_BREAKPOINT);
