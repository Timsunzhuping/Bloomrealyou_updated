import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';
import { AgentOrchestrator } from './ai-agents/agent-orchestrator.service';
import { AgentRateLimiter } from './ai-agents/rate-limiter/agent-rate-limiter.service';
import { ConversationManager } from './ai-agents/conversation-manager/conversation-manager.service';

/**
 * Boots the full application module to verify the dependency-injection graph
 * resolves — in particular that the AI agents module's cross-module
 * dependencies (products, orders, account, AI) are all wired correctly.
 */
describe('AppModule (DI smoke test)', () => {
  it('compiles the full module graph and registers agent tools', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();

    expect(moduleRef.get(AgentOrchestrator)).toBeDefined();
    expect(moduleRef.get(AgentRateLimiter)).toBeDefined();
    expect(moduleRef.get(ConversationManager)).toBeDefined();

    await moduleRef.close();
  });
});
