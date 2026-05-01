import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { AIProvider } from '@custom-merch/shared';

import { StorageModule } from '../storage/storage.module';
import { AIRequestLogRepository } from './ai-request-log.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AI_PROVIDER } from './ai.tokens';
import { DoubaoProvider } from './providers/doubao.provider';
import { MockAIProvider } from './providers/mock-ai.provider';
import { OpenAIProvider } from './providers/openai.provider';

const log = new Logger('AIModule');

const aiProviderFactory: Provider<AIProvider> = {
  provide: AI_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AIProvider => {
    const arkKey = config.get<string>('ARK_API_KEY');
    const openAiKey = config.get<string>('OPENAI_API_KEY');
    const provider = config.get<string>('AI_PROVIDER') ?? (arkKey ? 'doubao' : openAiKey ? 'openai' : 'mock');

    if (provider === 'doubao' && arkKey) {
      log.log('AI provider: doubao');
      return new DoubaoProvider({
        apiKey: arkKey,
        baseUrl: config.get<string>('ARK_BASE_URL'),
        textModel: config.get<string>('DOUBAO_TEXT_MODEL'),
        imageModel: config.get<string>('DOUBAO_IMAGE_MODEL'),
      });
    }

    if (provider === 'openai' && openAiKey) {
      log.log('AI provider: openai');
      return new OpenAIProvider({
        apiKey: openAiKey,
        model: config.get<string>('OPENAI_MODEL'),
        baseUrl: config.get<string>('OPENAI_BASE_URL'),
      });
    }

    log.warn('AI provider: mock (set ARK_API_KEY for Doubao/Ark or OPENAI_API_KEY for OpenAI)');
    return new MockAIProvider();
  },
};

@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [AIController],
  providers: [AIRequestLogRepository, AIService, aiProviderFactory],
  exports: [AIService],
})
export class AIModule {}
