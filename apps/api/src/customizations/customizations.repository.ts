import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CustomerDesignDto, ValidationResult } from '@custom-merch/shared';

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
 * In-memory repository for the WP-07 MVP. Mirrors the public surface of the
 * future Prisma repository (`customer_designs` table) so swapping it out
 * later is a one-file change.
 */
@Injectable()
export class CustomizationsRepository {
  private readonly designs = new Map<string, CustomerDesignDto>();

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
}
