import { Injectable, Logger } from '@nestjs/common';

import type { AdminShipmentDto, ShipmentStatus } from '@custom-merch/shared';

interface ListFilter {
  q?: string;
  status?: ShipmentStatus;
  orderId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Async surface implemented by both backends. The in-memory repo wraps each
 * sync method in a Promise so callers can `await` either implementation —
 * this keeps the Prisma cutover behind a single decision point in the module
 * factory rather than spreading branching across every call site.
 */
export interface ShipmentRepositoryAsync {
  listAsync(filter?: ListFilter): Promise<{
    items: AdminShipmentDto[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  getAsync(id: string): Promise<AdminShipmentDto | undefined>;
  saveAsync(shipment: AdminShipmentDto): Promise<AdminShipmentDto>;
  updateAsync(id: string, patch: Partial<AdminShipmentDto>): Promise<AdminShipmentDto | undefined>;
  listForOrderAsync(orderId: string): Promise<AdminShipmentDto[]>;
}

interface PrismaShipmentRow {
  id: string;
  orderId: string;
  carrier: string;
  serviceLevel: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  currency: string;
  shippingCostAmountMinor: number | null;
  packageWeightGrams: number | null;
  shippedAt: Date | null;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  metadata: { shipmentNumber?: string; productionJobIds?: string[]; notes?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  order?: { orderNumber?: string };
}

// Loose Prisma client so this file compiles without a generated client at hand.
// The real Nest factory hands in a fully-typed instance at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any;

/**
 * Prisma-backed implementation of the shipment repository.
 *
 * Selected by the module factory whenever `DATABASE_URL` is set. Reads and
 * writes hit the `shipments` table directly so the relational store is the
 * source of truth; the in-memory implementation continues to be the default
 * for dev/CI without a database.
 *
 * Schema-vs-DTO gaps (`shipmentNumber`, `productionJobIds`, `notes`) ride
 * along under the `metadata` JSONB column so existing screens keep their
 * full feature set without a follow-up schema change.
 */
@Injectable()
export class AdminShipmentsPrismaRepository implements ShipmentRepositoryAsync {
  private readonly log = new Logger(AdminShipmentsPrismaRepository.name);

  constructor(private readonly prisma: PrismaLike) {}

  async listAsync(filter: ListFilter = {}): Promise<{
    items: AdminShipmentDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.orderId) where.orderId = filter.orderId;
    if (filter.q) {
      where.OR = [
        { trackingNumber: { contains: filter.q, mode: 'insensitive' } },
        { carrier: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { order: { select: { orderNumber: true } } },
      }) as Promise<PrismaShipmentRow[]>,
      this.prisma.shipment.count({ where }) as Promise<number>,
    ]);
    return {
      items: rows.map(toDto),
      total,
      page,
      pageSize,
    };
  }

  async getAsync(id: string): Promise<AdminShipmentDto | undefined> {
    const row = (await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { orderNumber: true } } },
    })) as PrismaShipmentRow | null;
    return row ? toDto(row) : undefined;
  }

  async saveAsync(shipment: AdminShipmentDto): Promise<AdminShipmentDto> {
    const row = (await this.prisma.shipment.upsert({
      where: { id: shipment.id },
      create: toCreate(shipment),
      update: toUpdate(shipment),
      include: { order: { select: { orderNumber: true } } },
    })) as PrismaShipmentRow;
    return toDto(row);
  }

  async updateAsync(
    id: string,
    patch: Partial<AdminShipmentDto>,
  ): Promise<AdminShipmentDto | undefined> {
    try {
      const row = (await this.prisma.shipment.update({
        where: { id },
        data: toPatch(patch),
        include: { order: { select: { orderNumber: true } } },
      })) as PrismaShipmentRow;
      return toDto(row);
    } catch (e) {
      this.log.warn(`update failed for ${id}: ${(e as Error).message}`);
      return undefined;
    }
  }

  async listForOrderAsync(orderId: string): Promise<AdminShipmentDto[]> {
    const rows = (await this.prisma.shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: { order: { select: { orderNumber: true } } },
    })) as PrismaShipmentRow[];
    return rows.map(toDto);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function toDto(row: PrismaShipmentRow): AdminShipmentDto {
  const meta = row.metadata ?? {};
  const shippingCost =
    row.shippingCostAmountMinor != null
      ? { amountMinor: row.shippingCostAmountMinor, currency: row.currency as 'USD' }
      : null;
  return {
    id: row.id,
    shipmentNumber: meta.shipmentNumber ?? `SHP-${row.id.slice(0, 8).toUpperCase()}`,
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? '',
    productionJobIds: meta.productionJobIds ?? [],
    carrier: row.carrier || null,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    shippingMethod: (row.serviceLevel ?? undefined) as AdminShipmentDto['shippingMethod'],
    shippingCost,
    status: row.status as ShipmentStatus,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    estimatedDeliveryAt: row.estimatedDeliveryAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    packageWeightGrams: row.packageWeightGrams,
    notes: meta.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCreate(s: AdminShipmentDto): Record<string, unknown> {
  return {
    id: s.id,
    orderId: s.orderId,
    carrier: s.carrier ?? '',
    serviceLevel: s.shippingMethod ?? null,
    trackingNumber: s.trackingNumber ?? null,
    trackingUrl: s.trackingUrl ?? null,
    status: s.status,
    currency: s.shippingCost?.currency ?? 'USD',
    shippingCostAmountMinor: s.shippingCost?.amountMinor ?? null,
    packageWeightGrams: s.packageWeightGrams ?? null,
    shippedAt: s.shippedAt ? new Date(s.shippedAt) : null,
    estimatedDeliveryAt: s.estimatedDeliveryAt ? new Date(s.estimatedDeliveryAt) : null,
    deliveredAt: s.deliveredAt ? new Date(s.deliveredAt) : null,
    metadata: {
      shipmentNumber: s.shipmentNumber,
      productionJobIds: s.productionJobIds,
      notes: s.notes,
    },
  };
}

function toUpdate(s: AdminShipmentDto): Record<string, unknown> {
  const out = toCreate(s);
  delete (out as { id?: unknown }).id;
  delete (out as { orderId?: unknown }).orderId;
  return out;
}

function toPatch(patch: Partial<AdminShipmentDto>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.carrier !== undefined) out.carrier = patch.carrier ?? '';
  if (patch.shippingMethod !== undefined) out.serviceLevel = patch.shippingMethod;
  if (patch.trackingNumber !== undefined) out.trackingNumber = patch.trackingNumber ?? null;
  if (patch.trackingUrl !== undefined) out.trackingUrl = patch.trackingUrl ?? null;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.shippingCost !== undefined) {
    out.currency = patch.shippingCost?.currency ?? 'USD';
    out.shippingCostAmountMinor = patch.shippingCost?.amountMinor ?? null;
  }
  if (patch.packageWeightGrams !== undefined) out.packageWeightGrams = patch.packageWeightGrams;
  if (patch.shippedAt !== undefined) out.shippedAt = patch.shippedAt ? new Date(patch.shippedAt) : null;
  if (patch.estimatedDeliveryAt !== undefined) {
    out.estimatedDeliveryAt = patch.estimatedDeliveryAt ? new Date(patch.estimatedDeliveryAt) : null;
  }
  if (patch.deliveredAt !== undefined) {
    out.deliveredAt = patch.deliveredAt ? new Date(patch.deliveredAt) : null;
  }
  return out;
}
