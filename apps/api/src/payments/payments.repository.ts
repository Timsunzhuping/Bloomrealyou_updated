import { Injectable } from '@nestjs/common';

import type { PaymentDto } from '@custom-merch/shared';

/** In-memory payments store. Mirrors the future Prisma `payments` table. */
@Injectable()
export class PaymentsRepository {
  private readonly payments = new Map<string, PaymentDto>();
  private readonly byProviderRef = new Map<string, string>();
  /** Idempotency: webhook event ids we've already handled. */
  private readonly processedEvents = new Set<string>();

  save(payment: PaymentDto): PaymentDto {
    this.payments.set(payment.id, payment);
    this.byProviderRef.set(payment.providerReference, payment.id);
    return payment;
  }

  get(id: string): PaymentDto | undefined {
    return this.payments.get(id);
  }

  findByProviderReference(reference: string): PaymentDto | undefined {
    const id = this.byProviderRef.get(reference);
    return id ? this.payments.get(id) : undefined;
  }

  markEventProcessed(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return false;
    this.processedEvents.add(eventId);
    return true;
  }

  listForOrder(orderId: string): PaymentDto[] {
    return Array.from(this.payments.values()).filter((p) => p.orderId === orderId);
  }
}
