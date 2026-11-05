'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** False during server rendering and hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
