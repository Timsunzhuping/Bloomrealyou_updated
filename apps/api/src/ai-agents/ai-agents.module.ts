import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

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
import { ModelConfigurationModule } from '../model-config/model-config.module';
import { ConfiguredLLMProvider } from './llm-provider/configured-llm.provider';

@Module({
  imports: [
    ConfigModule,
    AdminProductsModule,
    OrdersModule,
    AccountModule,
    AIModule,
    ModelConfigurationModule,
  ],
  controllers: [AiAgentsController],
  providers: [
    ConversationManager,
    ToolExecutor,
    AgentRateLimiter,
    AgentOrchestrator,
    AgentToolsRegistrar,
    ConfiguredLLMProvider,
    { provide: 'LLM_PROVIDER', useExisting: ConfiguredLLMProvider },
  ],
  exports: [ConversationManager, ToolExecutor, AgentOrchestrator, AgentRateLimiter, 'LLM_PROVIDER'],
})
export class AiAgentsModule implements OnModuleInit {
  constructor(private readonly toolsRegistrar: AgentToolsRegistrar) {}

  onModuleInit(): void {
    this.toolsRegistrar.registerAll();
  }
}
