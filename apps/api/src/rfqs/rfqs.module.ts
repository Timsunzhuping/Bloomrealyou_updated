import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { StorageModule } from '../storage/storage.module';

import { RFQsController } from './rfqs.controller';
import { RFQsRepository } from './rfqs.repository';
import { RFQsService } from './rfqs.service';

@Module({
  imports: [StorageModule, AdminAuthModule],
  controllers: [RFQsController],
  providers: [RFQsRepository, RFQsService],
  exports: [RFQsService, RFQsRepository],
})
export class RFQsModule {}
