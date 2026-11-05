import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service.js';
import { LedgerService } from './ledger/ledger.service.js';
import { RealtimeService } from './realtime/realtime.service.js';
import { WorkspaceStore } from './workspace/workspace.store.js';

/** Cross-cutting services every feature module depends on. */
@Global()
@Module({
  providers: [WorkspaceStore, LedgerService, RealtimeService, AuditService],
  exports: [WorkspaceStore, LedgerService, RealtimeService, AuditService],
})
export class CoreModule {}
