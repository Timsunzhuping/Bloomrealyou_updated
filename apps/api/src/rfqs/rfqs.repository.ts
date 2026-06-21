import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { RfqDto, RFQStatus } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'rfq';

/**
 * RFQ store. In-memory map is the runtime source of truth, made durable via
 * the {@link SnapshotStore}.
 */
@Injectable()
export class RFQsRepository implements OnModuleInit {
  private readonly log = new Logger(RFQsRepository.name);
  private readonly rfqs = new Map<string, RfqDto>();
  private readonly byNumber = new Map<string, string>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<RfqDto>(KIND);
    for (const row of rows) {
      this.rfqs.set(row.data.id, row.data);
      this.byNumber.set(row.data.rfqNumber, row.data.id);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} RFQs from durable store`);
    }
  }

  private persist(rfq: RfqDto): void {
    this.snapshots.put(KIND, rfq.id, rfq, rfq.rfqNumber);
  }

  save(rfq: RfqDto): RfqDto {
    this.rfqs.set(rfq.id, rfq);
    this.byNumber.set(rfq.rfqNumber, rfq.id);
    this.persist(rfq);
    return rfq;
  }

  get(id: string): RfqDto | undefined {
    return this.rfqs.get(id);
  }

  getByNumber(rfqNumber: string): RfqDto | undefined {
    const id = this.byNumber.get(rfqNumber);
    return id ? this.rfqs.get(id) : undefined;
  }

  setStatus(id: string, status: RFQStatus): RfqDto | undefined {
    const existing = this.rfqs.get(id);
    if (!existing) return undefined;
    const now = new Date().toISOString();
    const updated: RfqDto = {
      ...existing,
      status,
      updatedAt: now,
      reviewedAt:
        existing.reviewedAt ?? (status !== 'submitted' ? now : null),
    };
    this.rfqs.set(id, updated);
    this.persist(updated);
    return updated;
  }

  setQuoteRef(id: string, quoteId: string | null): RfqDto | undefined {
    const existing = this.rfqs.get(id);
    if (!existing) return undefined;
    const updated: RfqDto = {
      ...existing,
      convertedQuoteId: quoteId,
      updatedAt: new Date().toISOString(),
    };
    this.rfqs.set(id, updated);
    this.persist(updated);
    return updated;
  }

  setOrderRef(id: string, orderId: string): RfqDto | undefined {
    const existing = this.rfqs.get(id);
    if (!existing) return undefined;
    const updated: RfqDto = {
      ...existing,
      convertedOrderId: orderId,
      status: 'converted_to_order',
      updatedAt: new Date().toISOString(),
    };
    this.rfqs.set(id, updated);
    this.persist(updated);
    return updated;
  }

  /** List newest-first. Optional status filter. */
  list(filter?: { status?: RFQStatus }): RfqDto[] {
    const all = Array.from(this.rfqs.values());
    const filtered = filter?.status
      ? all.filter((r) => r.status === filter.status)
      : all;
    return filtered.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
}
