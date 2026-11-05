'use client';

import type { Notification } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState, Popover } from '@/components/ui/controls';
import { api } from '@/lib/api/client';
import { useNotifications } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/format';

const TONE_DOT: Record<Notification['tone'], string> = {
  neutral: 'bg-ink-3',
  positive: 'bg-positive',
  attention: 'bg-warning',
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((notification) => !notification.read).length;

  const markRead = useMutation({
    mutationFn: () => api('/notifications/read', { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-[360px] max-w-[calc(100vw-24px)]"
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`}>
          <span className="relative">
            <Bell />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-negative ring-2 ring-canvas" />
            )}
          </span>
        </Button>
      }
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-display text-[19px] text-ink">Notifications</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate()}
            className="text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <EmptyState title="All clear" description="New activity will show up here." />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href ?? '#'}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.read ? 'bg-line-strong' : TONE_DOT[notification.tone],
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-ink">
                      {notification.title}
                    </span>
                    <span className="block text-[13px] text-ink-2">{notification.body}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      {relativeTime(notification.at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Popover>
  );
}
