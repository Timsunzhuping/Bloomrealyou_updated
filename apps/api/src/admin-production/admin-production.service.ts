import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  generateProductionJobNumber,
  type AdminProductionJobDto,
  type AdminUserDto,
  type Currency,
  type ProductionJobAttachment,
  type ProductionJobNote,
  type ProductionJobStatus,
  type StorageProvider,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { AdminSuppliersRepository } from '../admin-suppliers/admin-suppliers.repository';
import { OrderProgressService } from '../notifications/order-progress.service';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { AdminProductionRepository } from './admin-production.repository';
import {
  AssignProductionSupplierBody,
  CreateProductionJobBody,
  UpdateProductionJobStatusBody,
  UploadQcResultBody,
} from './admin-production.dto';

const QC_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);

interface DataUrlParts {
  mime: string;
  buffer: Buffer;
}

function parseDataUrl(dataUrl: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1]!, buffer: Buffer.from(match[2]!, 'base64') };
}

@Injectable()
export class AdminProductionService {
  constructor(
    private readonly repo: AdminProductionRepository,
    private readonly orders: OrdersRepository,
    private readonly suppliers: AdminSuppliersRepository,
    private readonly audit: AuditLogsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly progress: OrderProgressService,
  ) {}

  list(filter: {
    q?: string;
    status?: string;
    supplierId?: string;
    orderId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.repo.list({
      q: filter.q,
      status: filter.status as ProductionJobStatus | undefined,
      supplierId: filter.supplierId,
      orderId: filter.orderId,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): AdminProductionJobDto {
    const job = this.repo.get(id);
    if (!job) throw new NotFoundException(`Production job not found: ${id}`);
    return job;
  }

  create(body: CreateProductionJobBody, actor: AdminUserDto): AdminProductionJobDto {
    const order = this.orders.get(body.orderId);
    if (!order) throw new NotFoundException(`Order not found: ${body.orderId}`);

    const items = order.items.filter((i) => body.orderItemIds.includes(i.id));
    if (items.length === 0) {
      throw new BadRequestException('No matching order items');
    }
    const productId = items[0]!.productId;
    const variantId = items[0]!.variantId;

    let supplierName: string | null = null;
    if (body.supplierId) {
      const supplier = this.suppliers.getSupplier(body.supplierId);
      if (!supplier) throw new NotFoundException(`Supplier not found: ${body.supplierId}`);
      supplierName = supplier.name;
    }

    // Plain UUID for Prisma `@db.Uuid` compatibility (the dual-write sink
    // rejects non-UUID ids silently). The customer-visible `jobNumber` keeps
    // its readable `JOB-YYYYMMDD-XXXXXX` shape via the shared generator.
    const id = randomUUID();
    const now = new Date().toISOString();
    const job: AdminProductionJobDto = {
      id,
      jobNumber: generateProductionJobNumber(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderItemIds: body.orderItemIds,
      supplierId: body.supplierId ?? null,
      supplierName,
      productId,
      variantId,
      printMethod: body.printMethod,
      quantity: body.quantity,
      status: body.supplierId ? 'assigned' : 'created',
      supplierCost: null,
      expectedReadyAt: null,
      startedAt: null,
      completedAt: null,
      qcNotes: null,
      qcAttachments: [],
      failureReason: null,
      internalNotes: [],
      createdAt: now,
      updatedAt: now,
    };
    this.repo.save(job);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductionJob',
      entityId: id,
      action: 'create',
      payload: { orderNumber: order.orderNumber, supplierId: body.supplierId ?? null },
      summary: `created production job ${job.jobNumber} for ${order.orderNumber}`,
    });
    return job;
  }

  setStatus(
    id: string,
    body: UpdateProductionJobStatusBody,
    actor: AdminUserDto,
  ): AdminProductionJobDto {
    const job = this.get(id);
    const previous = job.status;
    if (previous === body.status) return job;

    const patch: Partial<AdminProductionJobDto> = { status: body.status };
    const now = new Date().toISOString();

    switch (body.status) {
      case 'in_production':
        if (!job.startedAt) patch.startedAt = now;
        break;
      case 'qc_passed':
      case 'qc_failed':
        if (!job.completedAt) patch.completedAt = now;
        if (body.status === 'qc_failed') {
          patch.failureReason = body.failureReason ?? job.failureReason ?? 'QC failed';
        } else {
          patch.failureReason = null;
        }
        break;
      case 'cancelled':
        patch.failureReason = body.failureReason ?? job.failureReason ?? null;
        break;
      default:
        break;
    }

    if (body.note && body.note.trim().length > 0) {
      const note: ProductionJobNote = {
        id: randomUUID(),
        authorUserId: actor.id,
        authorName: actor.fullName,
        body: body.note.trim(),
        createdAt: now,
      };
      patch.internalNotes = [note, ...job.internalNotes];
    }

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Production job not found: ${id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductionJob',
      entityId: id,
      action: 'status_change',
      payload: { from: previous, to: body.status },
      summary: `${job.jobNumber}: ${previous} → ${body.status}`,
    });

    // Mirror selected statuses onto the parent order so customers see progress.
    if (body.status === 'in_production') {
      this.orders.setStatus(updated.orderId, 'in_production');
    } else if (body.status === 'qc_passed' || body.status === 'qc_failed') {
      this.orders.setStatus(updated.orderId, 'quality_inspection');
    } else if (body.status === 'shipped') {
      this.orders.setStatus(updated.orderId, 'shipped');
    } else if (body.status === 'cancelled') {
      this.orders.setStatus(updated.orderId, 'cancelled');
    }

    return updated;
  }

  assignSupplier(
    id: string,
    body: AssignProductionSupplierBody,
    actor: AdminUserDto,
  ): AdminProductionJobDto {
    const job = this.get(id);
    const supplier = this.suppliers.getSupplier(body.supplierId);
    if (!supplier) throw new NotFoundException(`Supplier not found: ${body.supplierId}`);

    const patch: Partial<AdminProductionJobDto> = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: job.status === 'created' ? 'assigned' : job.status,
      expectedReadyAt: body.expectedReadyAt ?? job.expectedReadyAt ?? null,
    };
    if (body.unitCostMinor !== undefined) {
      const currency = (body.currency ?? 'USD') as Currency;
      patch.supplierCost = {
        amountMinor: body.unitCostMinor * job.quantity,
        currency,
      };
    }

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Production job not found: ${id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductionJob',
      entityId: id,
      action: 'update',
      payload: {
        supplierId: supplier.id,
        unitCostMinor: body.unitCostMinor ?? null,
        type: 'assign_supplier',
      },
      summary: `assigned ${supplier.name} to ${job.jobNumber}`,
    });

    // Tell the supplier they have a new job. Customer is silent here — the
    // visible "in production" milestone fires when the supplier confirms +
    // starts via the supplier portal.
    this.progress.notify(updated.orderId, 'production_assigned', {
      job: updated,
      supplier,
    });
    return updated;
  }

  async uploadQc(
    id: string,
    body: UploadQcResultBody,
    actor: AdminUserDto,
  ): Promise<AdminProductionJobDto> {
    const job = this.get(id);

    let attachments = job.qcAttachments;
    if (body.attachmentDataUrl) {
      const parts = parseDataUrl(body.attachmentDataUrl);
      if (!parts || !QC_MIMES.has(parts.mime)) {
        throw new BadRequestException('Unsupported attachment type');
      }
      const ext = parts.mime.split('/')[1]!.replace('+xml', '');
      const fileName =
        body.attachmentFileName?.replace(/[^A-Za-z0-9._-]/g, '_') ?? `qc.${ext}`;
      const result = await this.storage.putObject({
        key: `production-qc/${job.id}/${randomUUID()}-${fileName}`,
        body: parts.buffer,
        contentType: parts.mime,
        cacheControl: 'private, max-age=300',
      });
      const attachment: ProductionJobAttachment = {
        id: randomUUID(),
        url: result.url,
        fileName,
        contentType: parts.mime,
        size: result.size,
        uploadedAt: new Date().toISOString(),
        note: body.notes ?? null,
      };
      attachments = [attachment, ...attachments];
    }

    const status: ProductionJobStatus = body.passed ? 'qc_passed' : 'qc_failed';
    const completedAt = job.completedAt ?? new Date().toISOString();
    const updated = this.repo.update(id, {
      status,
      completedAt,
      qcNotes: body.notes ?? job.qcNotes ?? null,
      qcAttachments: attachments,
      failureReason: body.passed ? null : body.failureReason ?? 'QC failed',
    });
    if (!updated) throw new NotFoundException(`Production job not found: ${id}`);

    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductionJob',
      entityId: id,
      action: body.passed ? 'approve' : 'reject',
      payload: {
        type: 'qc',
        passed: body.passed,
        attachments: attachments.length,
        failureReason: body.failureReason ?? null,
      },
      summary: `${job.jobNumber} QC ${body.passed ? 'passed' : 'failed'}`,
    });

    // Move parent order to quality_inspection so customers see the gate.
    if (body.passed) {
      this.orders.setStatus(updated.orderId, 'quality_inspection');
    }

    this.progress.notify(updated.orderId, body.passed ? 'qc_passed' : 'qc_failed', {
      job: updated,
      extra: { failureReason: body.failureReason ?? null },
    });
    return updated;
  }
}
