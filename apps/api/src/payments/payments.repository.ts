import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { PaymentDto } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'payment';
/** Webhook idempotency markers live under their own snapshot kind. */
const EVENT_KIND = 'payment_event';

/**
 * Payments repository — in-memory map made durable via the {@link SnapshotStore}.
 *
 * Persists two things:
 * - Payment records (the full {@link PaymentDto} as JSON).
 * - Webhook idempotency markers (processed provider event ids) so a retried
 *   webhook is not processed twice even across restarts.
 *
 * Same dual-write pattern as OrdersRepository: in-memory is the runtime source
 * of truth, write-through to durable storage, graceful no-op when no DB.
 */
@Injectable()
export class PaymentsRepository implements OnModuleInit {
  private readonly log = new Logger(PaymentsRepository.name);
  private readonly payments = new Map<string, PaymentDto>();
  private readonly byProviderRef = new Map<string, string>();
  /** Idempotency: webhook event ids we've already handled. */
  private readonly processedEvents = new Set<string>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<PaymentDto>(KIND);
    for (const row of rows) {
      this.payments.set(row.data.id, row.data);
      this.byProviderRef.set(row.data.providerReference, row.data.id);
    }

    const events = await this.snapshots.loadAll<{ eventId: string }>(EVENT_KIND);
    for (const ev of events) {
      this.processedEvents.add(ev.entityId);
    }

    if (rows.length > 0 || events.length > 0) {
      this.log.log(
        `Primed ${rows.length} payments + ${events.length} webhook markers from durable store`,
      );
    }
  }

  save(payment: PaymentDto): PaymentDto {
    this.payments.set(payment.id, payment);
    this.byProviderRef.set(payment.providerReference, payment.id);
    this.snapshots.put(KIND, payment.id, payment, payment.providerReference);
    return payment;
  }

  get(id: string): PaymentDto | undefined {
    return this.payments.get(id);
  }

  findByProviderReference(reference: string): PaymentDto | undefined {
    const id = this.byProviderRef.get(reference);
    return id ? this.payments.get(id) : undefined;
  }

  /**
   * Webhook idempotency: returns `true` the first time an event id is seen,
   * `false` on every subsequent call. The marker is write-through so a webhook
   * retried after a restart is still recognised as a duplicate.
   */
  markEventProcessed(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return false;
    this.processedEvents.add(eventId);
    this.snapshots.put(EVENT_KIND, eventId, { eventId, processedAt: new Date().toISOString() });
    return true;
  }

  listForOrder(orderId: string): PaymentDto[] {
    return Array.from(this.payments.values()).filter((p) => p.orderId === orderId);
  }
}
