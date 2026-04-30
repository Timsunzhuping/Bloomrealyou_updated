import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AdminTemplateDto,
  AdminUserDto,
  StorageProvider,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { AdminTemplatesRepository } from './admin-templates.repository';
import { CreateTemplateBody, UpdateTemplateBody } from './admin-templates.dto';

const SUPPORTED_PREVIEW_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
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
export class AdminTemplatesService {
  constructor(
    private readonly repo: AdminTemplatesRepository,
    private readonly audit: AuditLogsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  list(filter: { q?: string; category?: string; isPublished?: boolean; page?: number; pageSize?: number }) {
    return this.repo.list({
      q: filter.q,
      category: filter.category as AdminTemplateDto['supportedCategories'][number] | undefined,
      isPublished: filter.isPublished,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): AdminTemplateDto {
    const t = this.repo.get(id);
    if (!t) throw new NotFoundException(`Template not found: ${id}`);
    return t;
  }

  async create(input: CreateTemplateBody, actor: AdminUserDto): Promise<AdminTemplateDto> {
    const previewImageUrl = await this.resolvePreviewUrl(input.previewImageUrl, input.previewDataUrl);
    if (!previewImageUrl) {
      throw new NotFoundException('Template requires a preview image (URL or data URL).');
    }
    const id = `tpl_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const dto: AdminTemplateDto = {
      id,
      name: input.name,
      description: input.description ?? null,
      supportedCategories: input.supportedCategories,
      productId: input.productId ?? null,
      previewImageUrl,
      designJson: input.designJson,
      editableFields: input.editableFields ?? [],
      isFeatured: input.isFeatured ?? false,
      isPublished: input.isPublished ?? false,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.repo.save(dto);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Template',
      entityId: id,
      action: 'create',
      summary: `created template ${input.name.en}`,
    });
    return dto;
  }

  async update(id: string, input: UpdateTemplateBody, actor: AdminUserDto): Promise<AdminTemplateDto> {
    const existing = this.get(id);
    const previewImageUrl = input.previewDataUrl
      ? await this.resolvePreviewUrl(input.previewImageUrl, input.previewDataUrl)
      : input.previewImageUrl;

    const patch: Partial<AdminTemplateDto> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.supportedCategories !== undefined) patch.supportedCategories = input.supportedCategories;
    if (input.productId !== undefined) patch.productId = input.productId;
    if (previewImageUrl) patch.previewImageUrl = previewImageUrl;
    if (input.designJson !== undefined) patch.designJson = input.designJson;
    if (input.editableFields !== undefined) patch.editableFields = input.editableFields;
    if (input.isFeatured !== undefined) patch.isFeatured = input.isFeatured;
    if (input.isPublished !== undefined) patch.isPublished = input.isPublished;
    if (input.tags !== undefined) patch.tags = input.tags;

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Template not found: ${id}`);
    const action = patch.isPublished !== undefined && patch.isPublished !== existing.isPublished
      ? 'status_change'
      : 'update';
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Template',
      entityId: id,
      action,
      payload: { keys: Object.keys(patch) },
    });
    return updated;
  }

  delete(id: string, actor: AdminUserDto): void {
    this.get(id);
    this.repo.delete(id);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Template',
      entityId: id,
      action: 'delete',
    });
  }

  private async resolvePreviewUrl(
    previewUrl: string | undefined,
    dataUrl: string | undefined,
  ): Promise<string | undefined> {
    if (dataUrl) {
      const parts = parseDataUrl(dataUrl);
      if (!parts || !SUPPORTED_PREVIEW_MIMES.has(parts.mime)) return previewUrl;
      const ext = parts.mime.split('/')[1]!.replace('+xml', '');
      const result = await this.storage.putObject({
        key: `templates/${randomUUID()}.${ext}`,
        body: parts.buffer,
        contentType: parts.mime,
        cacheControl: 'public, max-age=86400',
      });
      return result.url;
    }
    return previewUrl;
  }
}
