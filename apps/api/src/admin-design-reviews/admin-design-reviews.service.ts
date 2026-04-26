import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AdminDesignReviewDto,
  AdminUserDto,
  CustomerDesignDto,
  DesignReviewDecisionResult,
  DesignStatus,
  OrderDto,
  OrderItemDto,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { CustomizationsRepository } from '../customizations/customizations.repository';
import { OrdersRepository } from '../orders/orders.repository';

interface ListFilter {
  status?: DesignStatus;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminDesignReviewsService {
  constructor(
    private readonly customizations: CustomizationsRepository,
    private readonly orders: OrdersRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  list(filter: ListFilter = {}): { items: AdminDesignReviewDto[]; total: number; page: number; pageSize: number } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    let rows = this.customizations.list();
    if (filter.status) rows = rows.filter((d) => d.status === filter.status);
    rows = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const total = rows.length;
    const sliced = rows.slice((page - 1) * pageSize, page * pageSize);
    const items = sliced.map((d) => this.materialise(d));
    return { items, total, page, pageSize };
  }

  get(id: string): AdminDesignReviewDto {
    const design = this.customizations.get(id);
    if (!design) throw new NotFoundException(`Design not found: ${id}`);
    return this.materialise(design);
  }

  approve(id: string, note: string | undefined, actor: AdminUserDto): DesignReviewDecisionResult {
    const updated = this.transition(id, 'approved', { reviewerNotes: undefined }, actor);
    // When the linked order is in `design_review`, advance it to `design_approved`.
    if (updated.linkedOrderId) {
      const order = this.orders.get(updated.linkedOrderId);
      if (order && order.status === 'design_review') {
        this.orders.setStatus(order.id, 'design_approved');
      }
    }
    const auditLog = this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'CustomerDesign',
      entityId: id,
      action: 'approve',
      payload: note ? { note } : undefined,
      summary: `approved design ${updated.name}`,
    });
    return { design: updated, auditLogId: auditLog.id, newStatus: 'approved' };
  }

  reject(
    id: string,
    input: { reason: string; note?: string },
    actor: AdminUserDto,
  ): DesignReviewDecisionResult {
    const updated = this.transition(
      id,
      'rejected',
      { reviewerNotes: input.reason },
      actor,
    );
    const auditLog = this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'CustomerDesign',
      entityId: id,
      action: 'reject',
      payload: { reason: input.reason, note: input.note },
      summary: `rejected design ${updated.name}: ${input.reason}`,
    });
    return { design: updated, auditLogId: auditLog.id, newStatus: 'rejected' };
  }

  requestRevision(
    id: string,
    input: { message: string; note?: string },
    actor: AdminUserDto,
  ): DesignReviewDecisionResult {
    const updated = this.transition(
      id,
      'revision_requested',
      { reviewerNotes: input.message },
      actor,
    );
    const auditLog = this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'CustomerDesign',
      entityId: id,
      action: 'update',
      payload: { message: input.message, note: input.note, type: 'revision_requested' },
      summary: `requested revision on design ${updated.name}`,
    });
    return { design: updated, auditLogId: auditLog.id, newStatus: 'revision_requested' };
  }

  private transition(
    id: string,
    status: DesignStatus,
    extra: { reviewerNotes?: string },
    actor: AdminUserDto,
  ): AdminDesignReviewDto {
    const design = this.customizations.get(id);
    if (!design) throw new NotFoundException(`Design not found: ${id}`);
    if (design.status === 'approved' && status !== 'approved') {
      throw new BadRequestException('Design is already approved');
    }

    // The base CustomerDesignDto doesn't track reviewerNotes/reviewedBy; we
    // stash those via metadata so the in-memory repo doesn't need a schema
    // change for the MVP.
    const updatedMetadata: Record<string, unknown> = {
      ...(design.metadata ?? {}),
      reviewerNotes: extra.reviewerNotes ?? null,
      reviewedByUserId: actor.id,
      reviewedByName: actor.fullName,
      reviewedAt: new Date().toISOString(),
    };
    const updated = this.customizations.update(id, {
      status,
      metadata: updatedMetadata,
    });
    if (!updated) throw new NotFoundException(`Design not found: ${id}`);
    return this.materialise(updated);
  }

  private materialise(design: CustomerDesignDto): AdminDesignReviewDto {
    const linked = findLinkedOrder(this.orders, design.id);
    const meta = design.metadata as
      | { reviewerNotes?: string | null; reviewedByUserId?: string | null; reviewedAt?: string | null }
      | null
      | undefined;
    return {
      ...design,
      linkedOrderId: linked?.id ?? null,
      linkedOrderNumber: linked?.orderNumber ?? null,
      reviewerNotes: meta?.reviewerNotes ?? null,
      reviewedByUserId: meta?.reviewedByUserId ?? null,
      reviewedAt: meta?.reviewedAt ?? null,
    };
  }
}

function findLinkedOrder(orders: OrdersRepository, designId: string): OrderDto | undefined {
  for (const order of orders.listAll()) {
    if (order.items.some((item: OrderItemDto) => item.customizationId === designId)) {
      return order;
    }
  }
  return undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
