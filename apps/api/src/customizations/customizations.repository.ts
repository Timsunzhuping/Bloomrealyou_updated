import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CustomerDesignDto, ValidationResult } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'design';

interface CreateInput {
  ownerUserId: string;
  organizationId?: string | null;
  productId: string;
  variantId?: string | null;
  templateId?: string | null;
  name: string;
  designJson: Record<string, unknown>;
  previewImageUrl?: string | null;
}

/**
 * Customer designs repository. In-memory maps are the runtime source of truth;
 * the {@link SnapshotStore} makes them durable so customer designs (their IP)
 * survive restarts. The owning anonymous session is stored in the snapshot
 * `refKey` so the design↔session mapping is rebuilt on boot.
 */
@Injectable()
export class CustomizationsRepository implements OnModuleInit {
  private readonly log = new Logger(CustomizationsRepository.name);
  private readonly designs = new Map<string, CustomerDesignDto>();
  /** designId -> ownerSessionId. Anonymous-user scoping for the MVP. */
  private readonly designSession = new Map<string, string>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<CustomerDesignDto>(KIND);
    for (const row of rows) {
      this.designs.set(row.data.id, row.data);
      if (row.refKey) this.designSession.set(row.data.id, row.refKey);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} designs from durable store`);
    }
  }

  private persist(dto: CustomerDesignDto): void {
    this.snapshots.put(KIND, dto.id, dto, this.designSession.get(dto.id) ?? null);
  }

  create(input: CreateInput): CustomerDesignDto {
    const now = new Date().toISOString();
    const id = randomUUID();
    const dto: CustomerDesignDto = {
      id,
      ownerUserId: input.ownerUserId,
      organizationId: input.organizationId ?? null,
      productId: input.productId,
      variantId: input.variantId ?? null,
      templateId: input.templateId ?? null,
      name: input.name,
      status: 'draft',
      designJson: input.designJson,
      previewImageUrl: input.previewImageUrl ?? null,
      productionFileUrl: null,
      validationResult: null,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    };
    this.designs.set(id, dto);
    this.persist(dto);
    return dto;
  }

  get(id: string): CustomerDesignDto | undefined {
    return this.designs.get(id);
  }

  update(id: string, patch: Partial<CustomerDesignDto>): CustomerDesignDto | undefined {
    const existing = this.designs.get(id);
    if (!existing) return undefined;
    const next: CustomerDesignDto = {
      ...existing,
      ...patch,
      id: existing.id,
      ownerUserId: existing.ownerUserId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.designs.set(id, next);
    this.persist(next);
    return next;
  }

  setValidation(id: string, result: ValidationResult): CustomerDesignDto | undefined {
    return this.update(id, { validationResult: result });
  }

  setPreviewUrl(id: string, url: string): CustomerDesignDto | undefined {
    return this.update(id, { previewImageUrl: url });
  }

  setProductionUrl(id: string, url: string): CustomerDesignDto | undefined {
    return this.update(id, { productionFileUrl: url });
  }

  list(): CustomerDesignDto[] {
    return Array.from(this.designs.values());
  }

  /** Track ownership for the anonymous-user model. */
  setSession(designId: string, sessionId: string): void {
    this.designSession.set(designId, sessionId);
    // Re-persist so the owning session (snapshot refKey) survives restarts.
    const dto = this.designs.get(designId);
    if (dto) this.persist(dto);
  }

  /** List designs owned by a given anonymous session, newest first. */
  listForSession(sessionId: string): CustomerDesignDto[] {
    const ids = Array.from(this.designSession.entries())
      .filter(([, owner]) => owner === sessionId)
      .map(([designId]) => designId);
    return ids
      .map((id) => this.designs.get(id))
      .filter((d): d is CustomerDesignDto => !!d)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
