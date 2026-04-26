import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { AIProvider } from '@custom-merch/shared';

import { AIRequestLogRepository } from './ai-request-log.repository';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AI_PROVIDER } from './ai.tokens';
import { MockAIProvider } from './providers/mock-ai.provider';
import { OpenAIProvider } from './providers/openai.provider';

const log = new Logger('AIModule');

const aiProviderFactory: Provider<AIProvider> = {
  provide: AI_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AIProvider => {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    const provider = config.get<string>('AI_PROVIDER') ?? (apiKey ? 'openai' : 'mock');
    if (provider === 'openai' && apiKey) {
      log.log('AI provider: openai');
      return new OpenAIProvider({
        apiKey,
        model: config.get<string>('OPENAI_MODEL'),
        baseUrl: config.get<string>('OPENAI_BASE_URL'),
      });
    }
    log.warn('AI provider: mock (set OPENAI_API_KEY to enable real AI)');
    return new MockAIProvider();
  },
};

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [AIRequestLogRepository, AIService, aiProviderFactory],
  exports: [AIService],
})
export class AIModule {}
