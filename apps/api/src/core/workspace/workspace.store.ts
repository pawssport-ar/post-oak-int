import { Injectable, Logger } from '@nestjs/common';
import { toIsoDate } from '../../common/time.js';
import { buildSeedData } from '../../seed/seed-data.js';
import type { Workspace, WorkspaceData } from './workspace.js';

const MAX_SANDBOXES = 100;
const IDLE_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * In-memory sandboxes, one per visitor, so reviewers can move money without seeing
 * each other's changes. Bounded by an idle TTL and an LRU cap.
 */
@Injectable()
export class WorkspaceStore {
  private readonly logger = new Logger(WorkspaceStore.name);
  private readonly sandboxes = new Map<string, Workspace>();
  private seed: { day: string; data: WorkspaceData } | null = null;

  resolve(id: string): Workspace {
    const existing = this.sandboxes.get(id);
    if (existing) {
      existing.lastSeenAt = Date.now();
      return existing;
    }
    return this.create(id);
  }

  /** The live workspace for an id, without creating or touching it. */
  peek(id: string): Workspace | undefined {
    return this.sandboxes.get(id);
  }

  reset(id: string): Workspace {
    const current = this.sandboxes.get(id);
    if (current) this.dispose(current);
    return this.create(id);
  }

  private create(id: string): Workspace {
    this.evict();
    const workspace: Workspace = {
      ...structuredClone(this.seedForToday()),
      id,
      createdAt: new Date(),
      lastSeenAt: Date.now(),
      idempotency: new Map(),
      timers: new Set(),
    };
    this.sandboxes.set(id, workspace);
    this.logger.log(`Created sandbox ${id.slice(0, 8)} (${this.sandboxes.size} active)`);
    return workspace;
  }

  /** The seed is anchored to today, so "last 30 days" always means what it says. */
  private seedForToday(): WorkspaceData {
    const now = new Date();
    const day = toIsoDate(now);
    if (this.seed?.day !== day) this.seed = { day, data: buildSeedData(now) };
    return this.seed.data;
  }

  private evict(): void {
    const now = Date.now();
    for (const workspace of this.sandboxes.values()) {
      if (now - workspace.lastSeenAt > IDLE_TTL_MS) this.dispose(workspace);
    }
    if (this.sandboxes.size < MAX_SANDBOXES) return;
    const oldest = [...this.sandboxes.values()].sort((a, b) => a.lastSeenAt - b.lastSeenAt)[0];
    if (oldest) this.dispose(oldest);
  }

  private dispose(workspace: Workspace): void {
    for (const timer of workspace.timers) clearTimeout(timer);
    workspace.timers.clear();
    this.sandboxes.delete(workspace.id);
  }
}
