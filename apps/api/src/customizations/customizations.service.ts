import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CustomerDesignDto,
  GenerateProductionFileResult,
  RenderPreviewResult,
  ValidationResult,
} from '@custom-merch/shared';

import { FilesService } from '../files/files.service';

import { CustomizationsRepository } from './customizations.repository';
import { validateDesign } from './validation.engine';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class CustomizationsService {
  constructor(
    private readonly repo: CustomizationsRepository,
    private readonly files: FilesService,
  ) {}

  async create(input: {
    productId: string;
    variantId?: string | null;
    templateId?: string | null;
    name?: string;
    designJson: Record<string, unknown>;
    previewDataUrl?: string;
    ownerUserId?: string;
    organizationId?: string | null;
  }): Promise<CustomerDesignDto> {
    const dto = this.repo.create({
      ownerUserId: input.ownerUserId ?? DEFAULT_USER_ID,
      organizationId: input.organizationId ?? null,
      productId: input.productId,
      variantId: input.variantId ?? null,
      templateId: input.templateId ?? null,
      name: input.name ?? 'Untitled design',
      designJson: input.designJson,
    });

    if (input.previewDataUrl) {
      const upload = await this.files.uploadPreview(dto.id, input.previewDataUrl);
      const updated = this.repo.setPreviewUrl(dto.id, upload.url);
      if (updated) return updated;
    }

    return dto;
  }

  get(id: string): CustomerDesignDto {
    const dto = this.repo.get(id);
    if (!dto) throw new NotFoundException(`Design not found: ${id}`);
    return dto;
  }

  async patch(
    id: string,
    patch: {
      name?: string;
      status?: CustomerDesignDto['status'];
      designJson?: Record<string, unknown>;
      previewDataUrl?: string;
      reviewerNotes?: string;
    },
  ): Promise<CustomerDesignDto> {
    const existing = this.repo.get(id);
    if (!existing) throw new NotFoundException(`Design not found: ${id}`);

    let nextPreviewUrl = existing.previewImageUrl;
    if (patch.previewDataUrl) {
      const upload = await this.files.uploadPreview(id, patch.previewDataUrl);
      nextPreviewUrl = upload.url;
    }

    const updated = this.repo.update(id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.designJson !== undefined ? { designJson: patch.designJson } : {}),
      ...(nextPreviewUrl !== existing.previewImageUrl
        ? { previewImageUrl: nextPreviewUrl }
        : {}),
    });
    return updated ?? existing;
  }

  async renderPreview(id: string, previewDataUrl?: string): Promise<RenderPreviewResult> {
    const existing = this.repo.get(id);
    if (!existing) throw new NotFoundException(`Design not found: ${id}`);
    const upload = await this.files.uploadPreview(id, previewDataUrl);
    this.repo.setPreviewUrl(id, upload.url);
    return { previewImageUrl: upload.url, generatedAt: new Date().toISOString() };
  }

  async generateProductionFile(
    id: string,
    formats: Array<'png' | 'svg' | 'pdf' | 'json'> = ['png', 'svg', 'pdf', 'json'],
    productionDataUrl?: string,
  ): Promise<GenerateProductionFileResult> {
    const existing = this.repo.get(id);
    if (!existing) throw new NotFoundException(`Design not found: ${id}`);

    const validation = validateDesign({
      designJson: existing.designJson,
      hasPreview: !!existing.previewImageUrl || !!productionDataUrl,
    });
    this.repo.setValidation(id, validation);
    if (!validation.ok) {
      throw new BadRequestException({
        message: 'Design is not production-ready',
        validation,
      });
    }

    const artifacts = await this.files.generateProduction(
      id,
      existing.designJson,
      productionDataUrl,
      formats,
    );
    const primary =
      artifacts.find((a) => a.format === 'pdf') ??
      artifacts.find((a) => a.format === 'png') ??
      artifacts.find((a) => a.format === 'svg') ??
      artifacts.find((a) => a.format === 'json');
    if (primary) this.repo.setProductionUrl(id, primary.url);
    return {
      artifacts,
      productionFileUrl: primary?.url,
      generatedAt: new Date().toISOString(),
    };
  }

  validate(id: string, designJson?: Record<string, unknown>): ValidationResult {
    const existing = this.repo.get(id);
    if (!existing) throw new NotFoundException(`Design not found: ${id}`);
    const result = validateDesign({
      designJson: designJson ?? existing.designJson,
      hasPreview: !!existing.previewImageUrl,
    });
    this.repo.setValidation(id, result);
    return result;
  }
}
