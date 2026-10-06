import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';

import { ModelConfigurationController } from './model-config.controller';
import { ModelConfigurationService } from './model-config.service';
import { ModelTransport } from './model-transport.service';
@Module({
  imports: [ConfigModule, AdminAuthModule],
  controllers: [ModelConfigurationController],
  providers: [ModelConfigurationService, ModelTransport],
  exports: [ModelConfigurationService, ModelTransport],
})
export class ModelConfigurationModule {}
