import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { StorageModule } from '../storage/storage.module';

import { AdminTemplatesController } from './admin-templates.controller';
import { AdminTemplatesRepository } from './admin-templates.repository';
import { AdminTemplatesService } from './admin-templates.service';

@Module({
  imports: [AdminAuthModule, StorageModule],
  controllers: [AdminTemplatesController],
  providers: [AdminTemplatesRepository, AdminTemplatesService],
  exports: [AdminTemplatesRepository],
})
export class AdminTemplatesModule {}
