import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminProductsModule } from '../admin-products/admin-products.module';
import { OrdersModule } from '../orders/orders.module';
import { AccountModule } from '../account/account.module';
import { AIModule } from '../ai/ai.module';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { AiAgentsController } from './ai-agents.controller';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { AgentRateLimiter } from './rate-limiter/agent-rate-limiter.service';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import { AgentToolsRegistrar } from './tool-executor/agent-tools.registrar';
import { ClaudeLLMProvider } from './llm-provider/claude-llm.provider';
import { OpenAILLMProvider } from './llm-provider/openai-llm.provider';
import { MockLLMProvider } from './llm-provider/mock-llm.provider';
import type { LLMProvider } from './llm-provider/llm-provider.interface';

const log = new Logger('AiAgentsModule');

const llmProviderFactory = {
  provide: 'LLM_PROVIDER',
  inject: [ConfigService],
  useFactory: (config: ConfigService): LLMProvider => {
    const provider = config.get<string>('AI_AGENT_PROVIDER') ?? 'mock';
    const claudeApiKey = config.get<string>('ANTHROPIC_API_KEY');
    const openaiApiKey = config.get<string>('OPENAI_API_KEY');

    if (provider === 'claude' && claudeApiKey) {
      log.log('AI agent provider: Claude');
      return new ClaudeLLMProvider(claudeApiKey, config.get<string>('ANTHROPIC_MODEL'));
    }

    if (provider === 'openai' && openaiApiKey) {
      log.log('AI agent provider: OpenAI');
      return new OpenAILLMProvider(openaiApiKey, config.get<string>('OPENAI_MODEL'));
    }

    log.warn(
      'AI agent provider: mock (set ANTHROPIC_API_KEY for Claude or OPENAI_API_KEY for OpenAI)',
    );
    return new MockLLMProvider();
  },
};

@Module({
  imports: [ConfigModule, AdminProductsModule, OrdersModule, AccountModule, AIModule],
  controllers: [AiAgentsController],
  providers: [
    ConversationManager,
    ToolExecutor,
    AgentRateLimiter,
    AgentOrchestrator,
    AgentToolsRegistrar,
    llmProviderFactory,
  ],
  exports: [ConversationManager, ToolExecutor, AgentOrchestrator, AgentRateLimiter, 'LLM_PROVIDER'],
})
export class AiAgentsModule implements OnModuleInit {
  constructor(private readonly toolsRegistrar: AgentToolsRegistrar) {}

  onModuleInit(): void {
    this.toolsRegistrar.registerAll();
  }
}
