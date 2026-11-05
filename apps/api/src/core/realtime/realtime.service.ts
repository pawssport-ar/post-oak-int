import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Notification, QueryScope, RealtimeEvent } from '@post-oak/contracts';
import { type Observable, Subject } from 'rxjs';
import type { Workspace } from '../workspace/workspace.js';

export type NotificationInput = Pick<Notification, 'title' | 'body' | 'tone'> & {
  href?: string;
};

interface Channel {
  subject: Subject<RealtimeEvent>;
  subscribers: number;
}

/** Fans server-side events out to the browser tabs of one sandbox. */
@Injectable()
export class RealtimeService {
  private readonly channels = new Map<string, Channel>();

  stream(workspaceId: string): Observable<RealtimeEvent> {
    return this.channel(workspaceId).subject.asObservable();
  }

  connect(workspaceId: string): () => void {
    const channel = this.channel(workspaceId);
    channel.subscribers += 1;
    return () => {
      channel.subscribers -= 1;
      if (channel.subscribers === 0) this.channels.delete(workspaceId);
    };
  }

  /** Sandboxes with a browser listening. The activity simulator only runs for these. */
  connectedWorkspaceIds(): string[] {
    return [...this.channels.entries()]
      .filter(([, channel]) => channel.subscribers > 0)
      .map(([id]) => id);
  }

  publish(
    workspace: Workspace,
    type: string,
    invalidate: QueryScope[],
    notification?: NotificationInput,
  ): void {
    const at = new Date().toISOString();
    const stored: Notification | null = notification
      ? {
          id: `ntf_${randomUUID().slice(0, 10)}`,
          at,
          title: notification.title,
          body: notification.body,
          tone: notification.tone,
          href: notification.href ?? null,
          read: false,
        }
      : null;
    if (stored) workspace.notifications.unshift(stored);

    this.channels.get(workspace.id)?.subject.next({
      id: randomUUID(),
      type,
      at,
      invalidate: stored ? [...invalidate, 'notifications'] : invalidate,
      notification: stored,
    });
  }

  private channel(workspaceId: string): Channel {
    let channel = this.channels.get(workspaceId);
    if (!channel) {
      channel = { subject: new Subject(), subscribers: 0 };
      this.channels.set(workspaceId, channel);
    }
    return channel;
  }
}
