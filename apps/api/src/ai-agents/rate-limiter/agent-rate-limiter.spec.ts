import { Test, TestingModule } from '@nestjs/testing';

import { AgentRateLimiter, RateLimitExceededError } from './agent-rate-limiter.service';
import { SnapshotStore } from '../../_lib/snapshot-store';

describe('AgentRateLimiter', () => {
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };
  const ORIGINAL_ENV = { ...process.env };

  async function makeLimiter(): Promise<AgentRateLimiter> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentRateLimiter, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();
    return module.get(AgentRateLimiter);
  }

  beforeEach(() => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('should accumulate tokens, cost and turns per user', async () => {
    const limiter = await makeLimiter();

    limiter.recordUsage('userA', 100, 0.01);
    limiter.recordUsage('userA', 50, 0.005);

    const usage = limiter.getUsage('userA');
    expect(usage.tokensUsed).toBe(150);
    expect(usage.costUsd).toBeCloseTo(0.015, 6);
    expect(usage.turns).toBe(2);
  });

  it('should write-through usage to the durable store', async () => {
    const limiter = await makeLimiter();
    limiter.recordUsage('userA', 100, 0.01);
    expect(snapshots.put).toHaveBeenCalledWith(
      'ai_agent_usage',
      expect.stringContaining('userA:'),
      expect.objectContaining({ userId: 'userA', tokensUsed: 100 }),
      'userA',
    );
  });

  it('should throw when the daily token limit is exceeded', async () => {
    process.env.AI_AGENT_MAX_TOKENS_PER_DAY = '100';
    process.env.AI_AGENT_MAX_COST_USD_PER_DAY = '0';
    process.env.AI_AGENT_MAX_TURNS_PER_DAY = '0';
    const limiter = await makeLimiter();

    limiter.recordUsage('userA', 100, 0);
    expect(() => limiter.assertWithinLimits('userA')).toThrow(RateLimitExceededError);
    try {
      limiter.assertWithinLimits('userA');
    } catch (err) {
      expect((err as RateLimitExceededError).reason).toBe('tokens');
    }
  });

  it('should throw when the daily turn limit is exceeded', async () => {
    process.env.AI_AGENT_MAX_TURNS_PER_DAY = '2';
    process.env.AI_AGENT_MAX_TOKENS_PER_DAY = '0';
    process.env.AI_AGENT_MAX_COST_USD_PER_DAY = '0';
    const limiter = await makeLimiter();

    limiter.recordUsage('userA', 1, 0);
    limiter.recordUsage('userA', 1, 0);
    expect(() => limiter.assertWithinLimits('userA')).toThrow(/turn/i);
  });

  it('should throw when the daily spend limit is exceeded', async () => {
    process.env.AI_AGENT_MAX_COST_USD_PER_DAY = '1';
    process.env.AI_AGENT_MAX_TOKENS_PER_DAY = '0';
    process.env.AI_AGENT_MAX_TURNS_PER_DAY = '0';
    const limiter = await makeLimiter();

    limiter.recordUsage('userA', 0, 1.5);
    try {
      limiter.assertWithinLimits('userA');
      fail('expected RateLimitExceededError');
    } catch (err) {
      expect((err as RateLimitExceededError).reason).toBe('cost');
    }
  });

  it('should isolate usage between users', async () => {
    const limiter = await makeLimiter();
    limiter.recordUsage('userA', 100, 0.01);
    expect(limiter.getUsage('userB').tokensUsed).toBe(0);
  });

  it('should restore only today’s usage windows on boot', async () => {
    const today = new Date().toISOString().slice(0, 10);
    snapshots.loadAll.mockResolvedValueOnce([
      {
        entityId: `userA:${today}`,
        refKey: 'userA',
        data: { userId: 'userA', date: today, tokensUsed: 500, costUsd: 0.1, turns: 3 },
      },
      {
        entityId: 'userB:2020-01-01',
        refKey: 'userB',
        data: { userId: 'userB', date: '2020-01-01', tokensUsed: 999, costUsd: 9, turns: 99 },
      },
    ]);
    const limiter = await makeLimiter();
    await limiter.onModuleInit();

    expect(limiter.getUsage('userA').tokensUsed).toBe(500);
    // Stale window dropped — userB starts fresh today.
    expect(limiter.getUsage('userB').tokensUsed).toBe(0);
  });
});
