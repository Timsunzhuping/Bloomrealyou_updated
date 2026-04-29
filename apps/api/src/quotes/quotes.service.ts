import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  generateQuoteNumber,
  type ConvertQuoteToOrderInput,
  type CreateQuoteInput,
  type CreateQuoteItemInput,
  type Currency,
  type Money,
  type OrderDto,
  type QuoteDto,
  type QuoteItemDto,
  type QuoteStatus,
  type RfqDto,
  type UpdateQuoteInput,
} from '@custom-merch/shared';

import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';
import { OrdersService } from '../orders/orders.service';
import { RFQsService } from '../rfqs/rfqs.service';

import { QuotesRepository } from './quotes.repository';

const DEFAULT_CURRENCY: Currency = 'USD';

@Injectable()
export class QuotesService {
  private readonly log = new Logger(QuotesService.name);

  constructor(
    private readonly repo: QuotesRepository,
    private readonly rfqs: RFQsService,
    private readonly orders: OrdersService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  /** Create a quote attached to an RFQ. The RFQ is moved to `quote_sent` … wait, no — */
  /** new quotes start as `draft`; admin must explicitly mark them `sent`. */
  createForRfq(rfqId: string, input: CreateQuoteInput): QuoteDto {
    const rfq = this.rfqs.get(rfqId); // throws NotFound if missing
    return this.persistQuote(rfq, input);
  }

  list(filter?: { status?: QuoteStatus; rfqId?: string }): QuoteDto[] {
    return this.repo.list(filter);
  }

  get(id: string): QuoteDto {
    const q = this.repo.get(id);
    if (!q) throw new NotFoundException(`Quote not found: ${id}`);
    return q;
  }

  update(id: string, input: UpdateQuoteInput): QuoteDto {
    const existing = this.get(id);
    if (existing.status === 'converted_to_order') {
      throw new BadRequestException('Cannot edit a quote that has been converted to an order');
    }

    const currency = existing.currency;
    const items = input.items
      ? buildItems(existing.id, input.items, currency)
      : existing.items;

    const totals = computeTotals(
      items,
      currency,
      input.shippingMinor ?? existing.shipping.amountMinor,
      input.taxMinor ?? existing.tax.amountMinor,
      input.discountMinor ?? existing.discount.amountMinor,
    );

    const sentAtPatch =
      input.status === 'sent' && !existing.sentAt
        ? { sentAt: new Date().toISOString() }
        : {};
    const acceptedAtPatch =
      input.status === 'accepted' && !existing.acceptedAt
        ? { acceptedAt: new Date().toISOString() }
        : {};
    const rejectedAtPatch =
      input.status === 'rejected' && !existing.rejectedAt
        ? { rejectedAt: new Date().toISOString() }
        : {};

    const updated = this.repo.patch(id, {
      ...(input.status ? { status: input.status } : {}),
      items,
      ...totals,
      ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
      ...(input.termsText !== undefined ? { termsText: input.termsText } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      ...sentAtPatch,
      ...acceptedAtPatch,
      ...rejectedAtPatch,
    });
    if (!updated) throw new NotFoundException(`Quote not found: ${id}`);

    if (input.status === 'sent' && updated.rfqId) {
      this.rfqs.setStatus(updated.rfqId, 'quote_sent');
      this.notifyQuoteReady(updated);
    }
    if (input.status === 'accepted' && updated.rfqId) {
      this.rfqs.setStatus(updated.rfqId, 'customer_accepted');
    }
    if (input.status === 'rejected' && updated.rfqId) {
      this.rfqs.setStatus(updated.rfqId, 'customer_rejected');
    }

    return updated;
  }

  /** Fire `quote.ready` once a quote transitions into `sent`. */
  private notifyQuoteReady(quote: QuoteDto): void {
    if (!quote.customerEmail) return;
    let rfqNumber: string | null = null;
    if (quote.rfqId) {
      try {
        rfqNumber = this.rfqs.get(quote.rfqId).rfqNumber;
      } catch {
        rfqNumber = null;
      }
    }
    this.dispatcher.enqueue({
      to: quote.customerEmail,
      templateKey: 'quote.ready',
      locale: quote.locale,
      subject: `Your quote ${quote.quoteNumber} is ready`,
      quoteId: quote.id,
      rfqId: quote.rfqId ?? undefined,
      data: {
        contactName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        rfqNumber: rfqNumber ?? '',
        totalFormatted: `${quote.currency} ${(quote.total.amountMinor / 100).toFixed(2)}`,
        validUntil: quote.validUntil ?? '',
        quoteUrl: `/account/quotes/${quote.quoteNumber}`,
      },
    });
  }

  convertToOrder(id: string, input: ConvertQuoteToOrderInput): OrderDto {
    const quote = this.get(id);
    if (quote.status === 'converted_to_order') {
      throw new BadRequestException('Quote is already converted to an order');
    }
    if (quote.items.length === 0) {
      throw new BadRequestException('Cannot convert an empty quote');
    }

    const order = this.orders.createFromQuote(quote, input);

    this.repo.patch(id, {
      status: 'converted_to_order',
      convertedOrderId: order.id,
    });

    if (quote.rfqId) {
      this.rfqs.markConverted(quote.rfqId, order.id);
    }

    this.log.log(`quote ${quote.quoteNumber} -> order ${order.orderNumber}`);
    return order;
  }

  private persistQuote(rfq: RfqDto, input: CreateQuoteInput): QuoteDto {
    const id = randomUUID();
    const currency = input.currency ?? DEFAULT_CURRENCY;
    const items = buildItems(id, input.items, currency);

    const totals = computeTotals(
      items,
      currency,
      input.shippingMinor ?? 0,
      input.taxMinor ?? 0,
      input.discountMinor ?? 0,
    );

    const now = new Date().toISOString();
    const quote: QuoteDto = {
      id,
      quoteNumber: generateQuoteNumber(),
      rfqId: rfq.id,
      status: 'draft',
      locale: rfq.locale,
      currency,
      customerEmail: rfq.email,
      customerName: rfq.contactName,
      companyName: rfq.companyName,
      items,
      ...totals,
      validUntil: input.validUntil ?? null,
      termsText: input.termsText ?? null,
      internalNotes: input.internalNotes ?? null,
      sentAt: null,
      acceptedAt: null,
      rejectedAt: null,
      convertedOrderId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.repo.save(quote);
    this.rfqs.setQuoteRef(rfq.id, id);
    this.rfqs.setStatus(rfq.id, 'supplier_quoting');
    this.log.log(`quote drafted ${quote.quoteNumber} for rfq=${rfq.rfqNumber}`);
    return quote;
  }
}

function buildItems(quoteId: string, inputs: CreateQuoteItemInput[], currency: Currency): QuoteItemDto[] {
  return inputs.map((line) => {
    const lineMinor = line.unitPriceMinor * line.quantity;
    return {
      id: randomUUID(),
      quoteId,
      productId: line.productId ?? null,
      description: line.description,
      category: line.category ?? null,
      quantity: line.quantity,
      unitPrice: { amountMinor: line.unitPriceMinor, currency },
      lineTotal: { amountMinor: lineMinor, currency },
      notes: line.notes ?? null,
    };
  });
}

interface ComputedTotals {
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
}

function computeTotals(
  items: QuoteItemDto[],
  currency: Currency,
  shippingMinor: number,
  taxMinor: number,
  discountMinor: number,
): ComputedTotals {
  const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotal.amountMinor, 0);
  const totalMinor = Math.max(0, subtotalMinor + shippingMinor + taxMinor - discountMinor);
  return {
    subtotal: { amountMinor: subtotalMinor, currency },
    shipping: { amountMinor: shippingMinor, currency },
    tax: { amountMinor: taxMinor, currency },
    discount: { amountMinor: discountMinor, currency },
    total: { amountMinor: totalMinor, currency },
  };
}
