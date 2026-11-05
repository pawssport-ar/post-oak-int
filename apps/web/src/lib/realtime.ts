'use client';

import type { Notification, RealtimeEvent } from '@post-oak/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/toaster';

export type ConnectionState = 'connecting' | 'live' | 'offline';

/** Subscribes to the sandbox event stream and turns events into cache refreshes and toasts. */
export function useRealtime(): ConnectionState {
  const client = useQueryClient();
  const [state, setState] = useState<ConnectionState>('connecting');
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onopen = () => setState('live');
    source.onerror = () => setState('offline');
    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as RealtimeEvent;
      if (seen.current.has(event.id)) return;
      seen.current.add(event.id);

      for (const scope of event.invalidate) {
        void client.invalidateQueries({ queryKey: [scope] });
      }
      if (event.notification) surface(event.notification);
    };
    return () => source.close();
  }, [client]);

  return state;
}

function surface(notification: Notification): void {
  toast({
    title: notification.title,
    description: notification.body,
    tone: notification.tone,
    ...(notification.href ? { href: notification.href } : {}),
  });
}
