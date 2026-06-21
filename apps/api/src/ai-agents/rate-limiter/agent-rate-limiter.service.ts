import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SnapshotStore } from '../../_lib/snapshot-store';

/** Durable per-user daily usage counters (snapshot kind). */
const USAGE_KIND = 'ai_agent_usage';

/** Per-user usage for a single UTC day. */
export interface DailyUsage {
  userId: string;
  /** UTC date (YYYY-MM-DD) this window covers. */
  date: string;
  tokensUsed: number;
  /** Accumulated estimated cost in USD. */
  costUsd: number;
  /** Number of agent turns (user → assistant exchanges) today. */
  turns: number;
}

/** Thrown when a user exceeds a configured limit. */
export class RateLimitExceededError extends Error {
  constructor(
    readonly reason: 'tokens' | 'cost' | 'turns',
    message: string,
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export interface RateLimiterConfig {
  /** Max tokens per user per day. 0 disables the check. */
  maxTokensPerDay: number;
  /** Max estimated spend (USD) per user per day. 0 disables the check. */
  maxCostUsdPerDay: number;
  /** Max agent turns per user per day. 0 disables the check. */
  maxTurnsPerDay: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokensPerDay: 100_000,
  maxCostUsdPerDay: 5.0,
  maxTurnsPerDay: 100,
};

/**
 * Enforces per-user daily limits on agent usage (tokens, cost, turns) and
 * tracks running totals. Counters are kept in memory (runtime source of truth)
 * and made durable via the {@link SnapshotStore} so a user can't reset their
 * daily cap by waiting for a redeploy.
 *
 * Limits are configurable via env:
 *   - AI_AGENT_MAX_TOKENS_PER_DAY
 *   - AI_AGENT_MAX_COST_USD_PER_DAY
 *   - AI_AGENT_MAX_TURNS_PER_DAY
 */
@Injectable()
export class AgentRateLimiter implements OnModuleInit {
  private readonly log = new Logger(AgentRateLimiter.name);
  private readonly usage = new Map<string, DailyUsage>();
  private readonly config: RateLimiterConfig;

  constructor(private readonly snapshots: SnapshotStore) {
    this.config = {
      maxTokensPerDay: numFromEnv('AI_AGENT_MAX_TOKENS_PER_DAY', DEFAULT_CONFIG.maxTokensPerDay),
      maxCostUsdPerDay: numFromEnv('AI_AGENT_MAX_COST_USD_PER_DAY', DEFAULT_CONFIG.maxCostUsdPerDay),
      maxTurnsPerDay: numFromEnv('AI_AGENT_MAX_TURNS_PER_DAY', DEFAULT_CONFIG.maxTurnsPerDay),
    };
  }

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<DailyUsage>(USAGE_KIND);
    const today = utcDate();
    let restored = 0;
    for (const row of rows) {
      // Only keep today's window; stale days are dropped on boot.
      if (row.data.date === today) {
        this.usage.set(row.entityId, row.data);
        restored += 1;
      }
    }
    if (restored > 0) {
      this.log.log(`Restored ${restored} active usage windows from durable store`);
    }
  }

  /** Composite key so each user gets a fresh window per UTC day. */
  private key(userId: string, date: string): string {
    return `${userId}:${date}`;
  }

  /** Read (or lazily create) today's usage window for a user. */
  getUsage(userId: string): DailyUsage {
    const date = utcDate();
    const key = this.key(userId, date);
    let current = this.usage.get(key);
    if (!current) {
      current = { userId, date, tokensUsed: 0, costUsd: 0, turns: 0 };
      this.usage.set(key, current);
    }
    return current;
  }

  /**
   * Assert the user is allowed to start another turn. Throws
   * {@link RateLimitExceededError} when a hard limit is already reached.
   * Call this *before* invoking the LLM.
   */
  assertWithinLimits(userId: string): void {
    const usage = this.getUsage(userId);
    if (this.config.maxTurnsPerDay > 0 && usage.turns >= this.config.maxTurnsPerDay) {
      throw new RateLimitExceededError(
        'turns',
        `Daily conversation limit reached (${this.config.maxTurnsPerDay} turns).`,
      );
    }
    if (this.config.maxTokensPerDay > 0 && usage.tokensUsed >= this.config.maxTokensPerDay) {
      throw new RateLimitExceededError(
        'tokens',
        `Daily token limit reached (${this.config.maxTokensPerDay} tokens).`,
      );
    }
    if (this.config.maxCostUsdPerDay > 0 && usage.costUsd >= this.config.maxCostUsdPerDay) {
      throw new RateLimitExceededError(
        'cost',
        `Daily spend limit reached ($${this.config.maxCostUsdPerDay.toFixed(2)}).`,
      );
    }
  }

  /** Record the cost of a completed turn and persist the running totals. */
  recordUsage(userId: string, tokens: number, costUsd: number): DailyUsage {
    const usage = this.getUsage(userId);
    usage.tokensUsed += tokens;
    usage.costUsd += costUsd;
    usage.turns += 1;
    const key = this.key(userId, usage.date);
    this.usage.set(key, usage);
    this.snapshots.put(USAGE_KIND, key, usage, userId);

    if (this.config.maxCostUsdPerDay > 0 && usage.costUsd >= this.config.maxCostUsdPerDay * 0.8) {
      this.log.warn(
        `User ${userId} at ${usage.costUsd.toFixed(2)}/${this.config.maxCostUsdPerDay} USD daily spend`,
      );
    }
    return usage;
  }

  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }
}

function numFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
