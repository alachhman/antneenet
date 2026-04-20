import { useEffect, useState } from 'react';

/** Matches `(max-width: N-1px)` so components can branch on narrow vs wide. */
export function useIsNarrow(breakpointPx = 640): boolean {
  const query = `(max-width: ${breakpointPx - 1}px)`;
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    setIsNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return isNarrow;
}
