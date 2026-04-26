import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  generateRFQNumber,
  type CreateRFQInput,
  type RfqDto,
  type RFQStatus,
  type StorageProvider,
} from '@custom-merch/shared';

import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { RFQsRepository } from './rfqs.repository';

const RFQ_LOGO_MIMES = new Set([
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
  const [, mime, base64] = match as unknown as [string, string, string];
  return { mime, buffer: Buffer.from(base64, 'base64') };
}

@Injectable()
export class RFQsService {
  private readonly log = new Logger(RFQsService.name);

  constructor(
    private readonly repo: RFQsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async create(input: CreateRFQInput): Promise<RfqDto> {
    const id = randomUUID();
    const rfqNumber = generateRFQNumber();
    const now = new Date().toISOString();

    let logoFileUrl: string | null = null;
    let logoFileName: string | null = null;
    if (input.logoDataUrl) {
      const parts = parseDataUrl(input.logoDataUrl);
      if (parts && RFQ_LOGO_MIMES.has(parts.mime)) {
        const ext = mimeToExt(parts.mime);
        const safeName = (input.logoFileName ?? `logo.${ext}`).replace(/[^A-Za-z0-9._-]/g, '_');
        const result = await this.storage.putObject({
          key: `rfqs/${id}/${safeName}`,
          body: parts.buffer,
          contentType: parts.mime,
          cacheControl: 'private, max-age=300',
        });
        logoFileUrl = result.url;
        logoFileName = safeName;
      } else {
        this.log.warn(`rfq ${rfqNumber}: ignoring unsupported logo upload (mime=${parts?.mime ?? 'unknown'})`);
      }
    }

    const rfq: RfqDto = {
      id,
      rfqNumber,
      status: 'submitted',
      locale: input.locale ?? 'en',
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      country: input.country,
      productCategories: input.productCategories,
      estimatedQuantity: input.estimatedQuantity,
      targetDeliveryDate: input.targetDeliveryDate ?? null,
      budgetRange: input.budgetRange,
      needSample: input.needSample ?? false,
      note: input.note ?? null,
      logoFileUrl,
      logoFileName,
      convertedQuoteId: null,
      convertedOrderId: null,
      submittedAt: now,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.repo.save(rfq);
    this.log.log(`rfq created ${rfqNumber} (id=${id}, qty=${rfq.estimatedQuantity})`);
    return rfq;
  }

  list(filter?: { status?: RFQStatus }): RfqDto[] {
    return this.repo.list(filter);
  }

  get(id: string): RfqDto {
    const rfq = this.repo.get(id);
    if (!rfq) throw new NotFoundException(`RFQ not found: ${id}`);
    return rfq;
  }

  setStatus(id: string, status: RFQStatus): RfqDto {
    const rfq = this.repo.setStatus(id, status);
    if (!rfq) throw new NotFoundException(`RFQ not found: ${id}`);
    return rfq;
  }

  setQuoteRef(id: string, quoteId: string | null): void {
    this.repo.setQuoteRef(id, quoteId);
  }

  markConverted(id: string, orderId: string): RfqDto | undefined {
    return this.repo.setOrderRef(id, orderId);
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
