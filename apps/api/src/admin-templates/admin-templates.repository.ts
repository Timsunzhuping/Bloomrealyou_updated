import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AdminTemplateDto, ProductCategory } from '@custom-merch/shared';

interface ListFilter {
  q?: string;
  category?: ProductCategory;
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminTemplatesRepository {
  private readonly templates = new Map<string, AdminTemplateDto>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const NOW = '2026-04-26T00:00:00.000Z';
    const seedTemplates: AdminTemplateDto[] = [
      {
        id: `tpl_${randomUUID().slice(0, 8)}`,
        name: { en: 'Tech Conference Tee', 'zh-CN': '科技峰会 T 恤', es: 'Camiseta tech', ar: 'تيشيرت مؤتمر' },
        description: { en: 'Bold typography on the chest, year stamp on the sleeve.' },
        supportedCategories: ['t-shirts'],
        productId: null,
        previewImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23bfdbfe"/></svg>',
        designJson: { areas: [] },
        editableFields: [
          { key: 'eventName', label: { en: 'Event name' }, type: 'text', required: true },
          { key: 'year', label: { en: 'Year' }, type: 'text', defaultValue: '2026' },
        ],
        isFeatured: true,
        isPublished: true,
        tags: ['conference', 'tech'],
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: `tpl_${randomUUID().slice(0, 8)}`,
        name: { en: 'Birthday Mug', 'zh-CN': '生日马克杯', es: 'Taza de cumpleaños', ar: 'كوب عيد ميلاد' },
        description: { en: 'Curved name + age, ready for personalisation.' },
        supportedCategories: ['mugs'],
        productId: null,
        previewImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23fde68a"/></svg>',
        designJson: { areas: [] },
        editableFields: [
          { key: 'name', label: { en: 'Recipient name' }, type: 'text', required: true },
          { key: 'age', label: { en: 'Age' }, type: 'text' },
        ],
        isFeatured: false,
        isPublished: true,
        tags: ['gift', 'birthday'],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    for (const t of seedTemplates) this.templates.set(t.id, t);
  }

  list(filter: ListFilter = {}): { items: AdminTemplateDto[]; total: number; page: number; pageSize: number } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    const q = filter.q?.trim().toLowerCase() ?? '';
    let rows = Array.from(this.templates.values());
    if (filter.category) rows = rows.filter((t) => t.supportedCategories.includes(filter.category as ProductCategory));
    if (typeof filter.isPublished === 'boolean') rows = rows.filter((t) => t.isPublished === filter.isPublished);
    if (q.length > 0) {
      rows = rows.filter((t) =>
        Object.values(t.name).some((n) => (n ?? '').toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
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

  get(id: string): AdminTemplateDto | undefined {
    return this.templates.get(id);
  }

  save(template: AdminTemplateDto): AdminTemplateDto {
    this.templates.set(template.id, template);
    return template;
  }

  update(id: string, patch: Partial<AdminTemplateDto>): AdminTemplateDto | undefined {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const next: AdminTemplateDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.templates.set(id, next);
    return next;
  }

  delete(id: string): boolean {
    return this.templates.delete(id);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
