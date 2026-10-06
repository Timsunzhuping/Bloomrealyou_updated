import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelConfigurationModule } from '../model-config/model-config.module';

import { StorageModule } from '../storage/storage.module';
import { AIRequestLogRepository } from './ai-request-log.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AI_PROVIDER } from './ai.tokens';
import { ConfiguredAIProvider } from './providers/configured-ai.provider';

@Module({
  imports: [ConfigModule, StorageModule, ModelConfigurationModule],
  controllers: [AIController],
  providers: [
    AIRequestLogRepository,
    AIService,
    ConfiguredAIProvider,
    { provide: AI_PROVIDER, useExisting: ConfiguredAIProvider },
  ],
  exports: [AIService],
})
export class AIModule {}
