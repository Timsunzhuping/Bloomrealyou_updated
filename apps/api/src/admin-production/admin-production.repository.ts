import { Injectable } from '@nestjs/common';

import type {
  AdminProductionJobDto,
  ProductionJobAttachment,
  ProductionJobNote,
  ProductionJobStatus,
} from '@custom-merch/shared';

interface ListFilter {
  q?: string;
  status?: ProductionJobStatus;
  supplierId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminProductionRepository {
  private readonly jobs = new Map<string, AdminProductionJobDto>();
  private readonly byNumber = new Map<string, string>();

  list(filter: ListFilter = {}): {
    items: AdminProductionJobDto[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    let rows = Array.from(this.jobs.values());
    if (filter.status) rows = rows.filter((j) => j.status === filter.status);
    if (filter.supplierId) rows = rows.filter((j) => j.supplierId === filter.supplierId);
    if (filter.orderId) rows = rows.filter((j) => j.orderId === filter.orderId);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (j) =>
          j.jobNumber.toLowerCase().includes(q) ||
          j.orderNumber.toLowerCase().includes(q) ||
          (j.supplierName ?? '').toLowerCase().includes(q),
      );
    }
    rows = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  }

  get(id: string): AdminProductionJobDto | undefined {
    return this.jobs.get(id);
  }

  save(job: AdminProductionJobDto): AdminProductionJobDto {
    this.jobs.set(job.id, job);
    this.byNumber.set(job.jobNumber, job.id);
    return job;
  }

  update(id: string, patch: Partial<AdminProductionJobDto>): AdminProductionJobDto | undefined {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    const next: AdminProductionJobDto = {
      ...existing,
      ...patch,
      id: existing.id,
      jobNumber: existing.jobNumber,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, next);
    return next;
  }

  appendNote(id: string, note: ProductionJobNote): AdminProductionJobDto | undefined {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    return this.update(id, { internalNotes: [note, ...existing.internalNotes] });
  }

  appendAttachment(id: string, attachment: ProductionJobAttachment): AdminProductionJobDto | undefined {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    return this.update(id, { qcAttachments: [attachment, ...existing.qcAttachments] });
  }

  /** All jobs scoped to a single order (for shipment composition). */
  listForOrder(orderId: string): AdminProductionJobDto[] {
    return Array.from(this.jobs.values()).filter((j) => j.orderId === orderId);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
