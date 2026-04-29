import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  AdminUserDto,
  Currency,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';

import {
  CreateMappingBody,
  CreateSupplierBody,
  UpdateMappingBody,
  UpdateSupplierBody,
} from './admin-suppliers.dto';
import { AdminSuppliersRepository } from './admin-suppliers.repository';

@Injectable()
export class AdminSuppliersService {
  constructor(
    private readonly repo: AdminSuppliersRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  // ── suppliers ────────────────────────────────────────────────────────

  list(filter: {
    q?: string;
    country?: string;
    status?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.repo.listSuppliers({
      q: filter.q,
      country: filter.country,
      status: filter.status as AdminSupplierDto['status'] | undefined,
      category: filter.category as AdminSupplierDto['supportedCategories'][number] | undefined,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): AdminSupplierDto {
    const supplier = this.repo.getSupplier(id);
    if (!supplier) throw new NotFoundException(`Supplier not found: ${id}`);
    return supplier;
  }

  create(body: CreateSupplierBody, actor: AdminUserDto): AdminSupplierDto {
    // Plain UUID so the row is acceptable to Prisma's `@db.Uuid` columns when
    // DATABASE_URL is configured. Seeded demo IDs keep their `sup_*` prefixes
    // for back-office screenshots / docs and never hit Prisma anyway.
    const id = randomUUID();
    const now = new Date().toISOString();
    const dto: AdminSupplierDto = {
      id,
      name: body.name,
      country: body.country.toUpperCase(),
      region: body.region ?? null,
      contactName: body.contactName,
      contactEmail: body.contactEmail.toLowerCase(),
      contactPhone: body.contactPhone ?? null,
      supportedCategories: body.supportedCategories,
      supportedPrintMethods: body.supportedPrintMethods,
      minOrderQuantity: body.minOrderQuantity,
      averageProductionDays: body.averageProductionDays,
      qualityScore: body.qualityScore ?? 80,
      onTimeRate: body.onTimeRate ?? 0.9,
      returnRate: body.returnRate ?? 0.02,
      supportsWhiteLabel: body.supportsWhiteLabel ?? false,
      supportsSample: body.supportsSample ?? false,
      status: body.status ?? 'onboarding',
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.repo.saveSupplier(dto);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Supplier',
      entityId: id,
      action: 'create',
      summary: `created supplier ${dto.name}`,
    });
    return dto;
  }

  update(id: string, body: UpdateSupplierBody, actor: AdminUserDto): AdminSupplierDto {
    const existing = this.get(id);
    const patch: Partial<AdminSupplierDto> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.country !== undefined) patch.country = body.country.toUpperCase();
    if (body.region !== undefined) patch.region = body.region ?? null;
    if (body.contactName !== undefined) patch.contactName = body.contactName;
    if (body.contactEmail !== undefined) patch.contactEmail = body.contactEmail.toLowerCase();
    if (body.contactPhone !== undefined) patch.contactPhone = body.contactPhone ?? null;
    if (body.supportedCategories !== undefined) patch.supportedCategories = body.supportedCategories;
    if (body.supportedPrintMethods !== undefined) patch.supportedPrintMethods = body.supportedPrintMethods;
    if (body.minOrderQuantity !== undefined) patch.minOrderQuantity = body.minOrderQuantity;
    if (body.averageProductionDays !== undefined) patch.averageProductionDays = body.averageProductionDays;
    if (body.qualityScore !== undefined) patch.qualityScore = body.qualityScore;
    if (body.onTimeRate !== undefined) patch.onTimeRate = body.onTimeRate;
    if (body.returnRate !== undefined) patch.returnRate = body.returnRate;
    if (body.supportsWhiteLabel !== undefined) patch.supportsWhiteLabel = body.supportsWhiteLabel;
    if (body.supportsSample !== undefined) patch.supportsSample = body.supportsSample;
    if (body.status !== undefined) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;
    const updated = this.repo.updateSupplier(id, patch);
    if (!updated) throw new NotFoundException(`Supplier not found: ${id}`);
    const action = patch.status && patch.status !== existing.status ? 'status_change' : 'update';
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Supplier',
      entityId: id,
      action,
      payload: { keys: Object.keys(patch) },
      summary: `updated supplier ${updated.name}`,
    });
    return updated;
  }

  delete(id: string, actor: AdminUserDto): void {
    const existing = this.get(id);
    this.repo.deleteSupplier(id);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Supplier',
      entityId: id,
      action: 'delete',
      summary: `deleted supplier ${existing.name}`,
    });
  }

  // ── mappings ─────────────────────────────────────────────────────────

  listMappings(filter: { supplierId?: string; productId?: string; status?: string; page?: number; pageSize?: number }) {
    return this.repo.listMappings({
      supplierId: filter.supplierId,
      productId: filter.productId,
      status: filter.status as AdminSupplierProductMappingDto['status'] | undefined,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  createMapping(body: CreateMappingBody, actor: AdminUserDto): AdminSupplierProductMappingDto {
    const supplier = this.get(body.supplierId);
    if (!supplier) throw new NotFoundException(`Supplier not found: ${body.supplierId}`);
    if (body.minOrderQuantity > body.maxDailyCapacity * 7) {
      throw new BadRequestException('minOrderQuantity must be reachable within a week of capacity');
    }
    const currency = (body.currency ?? 'USD') as Currency;
    const id = randomUUID();
    const now = new Date().toISOString();
    const dto: AdminSupplierProductMappingDto = {
      id,
      supplierId: body.supplierId,
      productId: body.productId,
      variantId: body.variantId ?? null,
      supplierSku: body.supplierSku,
      costPrice: { amountMinor: body.costPriceMinor, currency },
      productionDays: body.productionDays,
      minOrderQuantity: body.minOrderQuantity,
      maxDailyCapacity: body.maxDailyCapacity,
      printMethods: body.printMethods,
      status: body.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.repo.saveMapping(dto);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'SupplierProductMapping',
      entityId: id,
      action: 'create',
      payload: { supplierId: body.supplierId, productId: body.productId, sku: body.supplierSku },
    });
    return dto;
  }

  updateMapping(id: string, body: UpdateMappingBody, actor: AdminUserDto): AdminSupplierProductMappingDto {
    const existing = this.repo.getMapping(id);
    if (!existing) throw new NotFoundException(`Mapping not found: ${id}`);
    const patch: Partial<AdminSupplierProductMappingDto> = {};
    if (body.supplierSku !== undefined) patch.supplierSku = body.supplierSku;
    if (body.costPriceMinor !== undefined) {
      patch.costPrice = {
        amountMinor: body.costPriceMinor,
        currency: (body.currency ?? existing.costPrice.currency) as Currency,
      };
    }
    if (body.productionDays !== undefined) patch.productionDays = body.productionDays;
    if (body.minOrderQuantity !== undefined) patch.minOrderQuantity = body.minOrderQuantity;
    if (body.maxDailyCapacity !== undefined) patch.maxDailyCapacity = body.maxDailyCapacity;
    if (body.printMethods !== undefined) patch.printMethods = body.printMethods;
    if (body.status !== undefined) patch.status = body.status;
    const updated = this.repo.updateMapping(id, patch);
    if (!updated) throw new NotFoundException(`Mapping not found: ${id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'SupplierProductMapping',
      entityId: id,
      action: 'update',
      payload: { keys: Object.keys(patch) },
    });
    return updated;
  }
}
