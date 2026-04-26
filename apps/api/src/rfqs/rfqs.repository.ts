import { Injectable } from '@nestjs/common';

import type { RfqDto, RFQStatus } from '@custom-merch/shared';

/** In-memory RFQ store. Drop-in replacement for the future Prisma table. */
@Injectable()
export class RFQsRepository {
  private readonly rfqs = new Map<string, RfqDto>();
  private readonly byNumber = new Map<string, string>();

  save(rfq: RfqDto): RfqDto {
    this.rfqs.set(rfq.id, rfq);
    this.byNumber.set(rfq.rfqNumber, rfq.id);
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
