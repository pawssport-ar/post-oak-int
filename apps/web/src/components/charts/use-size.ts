'use client';

import { type RefCallback, useCallback, useRef, useState } from 'react';

/** Tracks an element's content box, so SVG charts can draw at true pixel size. */
export function useSize<T extends HTMLElement>(): [
  RefCallback<T>,
  { width: number; height: number },
] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback<RefCallback<T>>((node) => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.current.observe(node);
  }, []);

  return [ref, size];
}
