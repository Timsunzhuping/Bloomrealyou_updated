import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getPrismaClient, PrismaClient } from '@custom-merch/db';

/**
 * NestJS wrapper around the shared Prisma client.
 * Provides lifecycle hooks (onModuleInit, onModuleDestroy) and logging.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);
  private client: PrismaClient;

  constructor() {
    this.client = getPrismaClient();
  }

  onModuleInit(): void {
    this.log.log('PrismaService initialized (client ready)');
  }

  onModuleDestroy(): void {
    // In production, don't disconnect the singleton; other modules may still need it.
    // Disconnect is handled by the process shutdown hook.
    this.log.log('PrismaService module destroyed');
  }

  /**
   * Direct access to the Prisma client for raw queries or migrations.
   * Use judiciously — prefer domain-specific repository methods.
   */
  get client_(): PrismaClient {
    return this.client;
  }

  // Convenience delegates to reduce verbosity in tests.
  get order() {
    return this.client.order;
  }

  get payment() {
    return this.client.payment;
  }

  get user() {
    return this.client.user;
  }

  get cart() {
    return this.client.cart;
  }

  get cartItem() {
    return this.client.cartItem;
  }

  get customerDesign() {
    return this.client.customerDesign;
  }

  get rFQ() {
    return this.client.rFQ;
  }

  get quote() {
    return this.client.quote;
  }

  get product() {
    return this.client.product;
  }

  get supplier() {
    return this.client.supplier;
  }

  get notificationLog() {
    return this.client.notificationLog;
  }

  get auditLog() {
    return this.client.auditLog;
  }

  // ... add more delegates as needed for each domain
}
