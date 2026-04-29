import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  generateRFQNumber,
  type CreateRFQInput,
  type RfqDto,
  type RFQStatus,
  type StorageProvider,
} from '@custom-merch/shared';

import { parseAllowedDataUrl } from '../_lib/file-upload';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { RFQsRepository } from './rfqs.repository';

/** RFQ logo cap: 4 MB (smaller than the global 8 MB so the inbox stays light). */
const RFQ_LOGO_MAX_BYTES = 4 * 1024 * 1024;

@Injectable()
export class RFQsService {
  private readonly log = new Logger(RFQsService.name);

  constructor(
    private readonly repo: RFQsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async create(input: CreateRFQInput): Promise<RfqDto> {
    const id = randomUUID();
    const rfqNumber = generateRFQNumber();
    const now = new Date().toISOString();

    let logoFileUrl: string | null = null;
    let logoFileName: string | null = null;
    if (input.logoDataUrl) {
      // Throws BadRequest on bad mime / oversize / SVG with embedded scripts.
      const validated = parseAllowedDataUrl(input.logoDataUrl, { maxBytes: RFQ_LOGO_MAX_BYTES });
      const ext = mimeToExt(validated.mime);
      const safeName = (input.logoFileName ?? `logo.${ext}`).replace(/[^A-Za-z0-9._-]/g, '_');
      const result = await this.storage.putObject({
        key: `rfqs/${id}/${safeName}`,
        body: validated.buffer,
        contentType: validated.mime,
        cacheControl: 'private, max-age=300',
      });
      logoFileUrl = result.url;
      logoFileName = safeName;
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
    if (rfq.email) {
      this.dispatcher.enqueue({
        to: rfq.email,
        templateKey: 'rfq.confirmation',
        locale: rfq.locale,
        subject: `We received your RFQ ${rfq.rfqNumber}`,
        rfqId: rfq.id,
        data: {
          contactName: rfq.contactName,
          rfqNumber: rfq.rfqNumber,
          slaHours: 24,
        },
      });
    }
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
