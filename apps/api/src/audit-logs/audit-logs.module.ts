import { Global, Module } from '@nestjs/common';

import { AuditLogsRepository } from './audit-logs.repository';

@Global()
@Module({
  providers: [AuditLogsRepository],
  exports: [AuditLogsRepository],
})
export class AuditLogsModule {}
