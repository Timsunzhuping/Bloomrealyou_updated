import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AICapabilityName } from '@custom-merch/shared';

export type AIRequestStatus = 'success' | 'failed';

export interface AIRequestLogEntry {
  id: string;
  userId: string | null;
  provider: 'mock' | 'openai' | 'anthropic' | 'doubao';
  requestType: AICapabilityName;
  /** JSON-serializable input payload. */
  input: Record<string, unknown>;
  /** JSON-serializable output payload (null on failure). */
  output: Record<string, unknown> | null;
  status: AIRequestStatus;
  errorMessage: string | null;
  latencyMs: number;
  createdAt: string;
}

/**
 * In-memory AI request log. Mirrors the future Prisma `ai_request_logs`
 * table so swapping in a real repository is mechanical.
 */
@Injectable()
export class AIRequestLogRepository {
  private readonly entries = new Map<string, AIRequestLogEntry>();

  record(entry: Omit<AIRequestLogEntry, 'id' | 'createdAt'>): AIRequestLogEntry {
    const dto: AIRequestLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.set(dto.id, dto);
    return dto;
  }

  list(): AIRequestLogEntry[] {
    return Array.from(this.entries.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
