import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { QuoteDto, QuoteStatus } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'quote';

@Injectable()
export class QuotesRepository implements OnModuleInit {
  private readonly log = new Logger(QuotesRepository.name);
  private readonly quotes = new Map<string, QuoteDto>();
  private readonly byNumber = new Map<string, string>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<QuoteDto>(KIND);
    for (const row of rows) {
      this.quotes.set(row.data.id, row.data);
      this.byNumber.set(row.data.quoteNumber, row.data.id);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} quotes from durable store`);
    }
  }

  save(quote: QuoteDto): QuoteDto {
    this.quotes.set(quote.id, quote);
    this.byNumber.set(quote.quoteNumber, quote.id);
    this.snapshots.put(KIND, quote.id, quote, quote.quoteNumber);
    return quote;
  }

  get(id: string): QuoteDto | undefined {
    return this.quotes.get(id);
  }

  getByNumber(quoteNumber: string): QuoteDto | undefined {
    const id = this.byNumber.get(quoteNumber);
    return id ? this.quotes.get(id) : undefined;
  }

  setStatus(id: string, status: QuoteStatus, patch?: Partial<QuoteDto>): QuoteDto | undefined {
    const existing = this.quotes.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: QuoteDto = {
      ...existing,
      ...patch,
      status,
      updatedAt: now,
    };
    this.quotes.set(id, updated);
    this.snapshots.put(KIND, updated.id, updated, updated.quoteNumber);
    return updated;
  }

  patch(id: string, partial: Partial<QuoteDto>): QuoteDto | undefined {
    const existing = this.quotes.get(id);
    if (!existing) return undefined;
    const updated: QuoteDto = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.quotes.set(id, updated);
    this.snapshots.put(KIND, updated.id, updated, updated.quoteNumber);
    return updated;
  }

  list(filter?: { status?: QuoteStatus; rfqId?: string }): QuoteDto[] {
    let all = Array.from(this.quotes.values());
    if (filter?.status) all = all.filter((q) => q.status === filter.status);
    if (filter?.rfqId) all = all.filter((q) => q.rfqId === filter.rfqId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
