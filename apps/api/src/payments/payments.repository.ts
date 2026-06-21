import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { PaymentDto } from '@custom-merch/shared';

import { PrismaService } from '../_lib/prisma.service';
import { runIfPrismaAvailable, readIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Payments repository — in-memory primary with optional Prisma persistence.
 *
 * Includes:
 * - Payment records (amount, status, provider details)
 * - Webhook idempotency (processed event IDs)
 *
 * Pattern same as OrdersRepository:
 * 1. In-memory Map is source of truth
 * 2. Prime from Prisma on boot
 * 3. Write to both (memory + Prisma fire-and-forget)
 * 4. Graceful degradation if DB unavailable
 */
@Injectable()
export class PaymentsRepository implements OnModuleInit {
  private readonly log = new Logger(PaymentsRepository.name);
  private readonly payments = new Map<string, PaymentDto>();
  private readonly byProviderRef = new Map<string, string>();
  /** Idempotency: webhook event ids we've already handled. */
  private readonly processedEvents = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.primeFromDatabase();
  }

  /**
   * Load payments from database on startup.
   */
  private async primeFromDatabase(): Promise<void> {
    const rows = await readIfPrismaAvailable('payments-prime', (client) =>
      client.payment.findMany(),
    );

    if (rows && rows.length > 0) {
      for (const row of rows) {
        const dto = this.rowToDto(row);
        this.payments.set(dto.id, dto);
        this.byProviderRef.set(dto.providerReference, dto.id);
      }
      this.log.log(`Primed ${rows.length} payments from database`);
    }
  }

  /**
   * Save payment to in-memory store and Prisma.
   */
  save(payment: PaymentDto): PaymentDto {
    this.payments.set(payment.id, payment);
    this.byProviderRef.set(payment.providerReference, payment.id);

    // Fire-and-forget write to Prisma
    runIfPrismaAvailable('payments-save', (client) =>
      client.payment.upsert({
        where: { id: payment.id },
        update: {
          status: payment.status,
          providerMetadata: payment.providerMetadata as any, // Store as JSON
          updatedAt: new Date(),
        },
        create: {
          id: payment.id,
          orderId: payment.orderId,
          providerReference: payment.providerReference,
          provider: payment.provider,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          status: payment.status,
          providerMetadata: payment.providerMetadata as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );

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
   * Webhook idempotency: mark event as processed.
   * Returns true if this is the first time we've seen this event ID,
   * false if we've already processed it.
   *
   * In production with Prisma, this should use a unique constraint
   * on (webhookProvider, eventId) to achieve idempotency at the DB level.
   */
  markEventProcessed(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return false;
    this.processedEvents.add(eventId);

    // Fire-and-forget: record in DB for recovery after restart
    runIfPrismaAvailable('payments-markEventProcessed', (client) =>
      client.webhookEvent.upsert({
        where: { eventId },
        update: { processedAt: new Date() },
        create: {
          eventId,
          provider: 'stripe', // TODO: make configurable
          processedAt: new Date(),
        },
      }),
    );

    return true;
  }

  listForOrder(orderId: string): PaymentDto[] {
    return Array.from(this.payments.values()).filter((p) => p.orderId === orderId);
  }

  /**
   * Convert Prisma row to DTO.
   */
  private rowToDto(row: any): PaymentDto {
    return {
      id: row.id,
      orderId: row.orderId,
      providerReference: row.providerReference,
      provider: row.provider,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status,
      providerMetadata: row.providerMetadata || {},
    };
  }
}
