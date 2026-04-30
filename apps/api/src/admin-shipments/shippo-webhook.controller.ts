import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ShipmentTrackingUpdate } from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { WebhookRateLimiterGuard } from './webhook-rate-limiter.guard';
import { applyTrackingUpdate, mapShippoStatus } from './webhook-shared';

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Shippo ({@link https://goshippo.com/docs/webhooks}) push receiver.
 *
 * Shippo signs each event with `X-Shippo-Signature` = hex HMAC-SHA-256 of
 * the raw body using the webhook secret. The dedup key combines the
 * `event_object_id` with `transmitted_at` so retried events for the same
 * tracker update don't double-process.
 */
@Controller('webhooks/shippo')
@UseGuards(WebhookRateLimiterGuard)
export class ShippoWebhookController {
  private readonly log = new Logger(ShippoWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly shipments: AdminShipmentsRepository,
    private readonly orders: OrdersRepository,
    private readonly audit: AuditLogsRepository,
    private readonly idempotency: WebhookIdempotencyService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: ShippoEnvelope,
    @Req() req: RequestWithRawBody,
  ): Promise<{ ok: true; updatedShipmentId?: string; deduped?: true }> {
    this.verifySignature(req);

    const data = body.data;
    if (!data?.tracking_number) {
      throw new BadRequestException('Missing data.tracking_number');
    }

    const key = `shippo:${body.event_object_id ?? data.tracking_number}:${body.transmitted_at ?? data.tracking_status?.status_date ?? ''}`;
    if (!(await this.idempotency.claim(key))) {
      this.log.log(`Dedup hit for ${key}`);
      return { ok: true, deduped: true };
    }

    const update = normalize(data);
    if (!update) return { ok: true };

    const updatedShipmentId = applyTrackingUpdate({
      source: 'shippo',
      trackingNumber: data.tracking_number,
      carrier: data.carrier ?? null,
      update,
      shipments: this.shipments,
      orders: this.orders,
      audit: this.audit,
      log: this.log,
    });
    return { ok: true, updatedShipmentId: updatedShipmentId ?? undefined };
  }

  private verifySignature(req: RequestWithRawBody): void {
    const secret = this.config.get<string>('SHIPPO_WEBHOOK_SECRET');
    if (!secret) {
      this.log.warn('SHIPPO_WEBHOOK_SECRET not set — skipping signature verification');
      return;
    }
    const headerValue = req.headers['x-shippo-signature'];
    const signature = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!signature || !req.rawBody) {
      throw new ForbiddenException('Missing webhook signature');
    }
    const expected = createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Invalid webhook signature');
    }
  }
}

interface ShippoEnvelope {
  event?: string;
  event_object_id?: string;
  transmitted_at?: string;
  data?: {
    tracking_number?: string;
    carrier?: string | null;
    eta?: string | null;
    tracking_status?: {
      status?: string;
      status_date?: string;
      status_details?: string;
    };
  };
}

function normalize(
  data: NonNullable<ShippoEnvelope['data']>,
): ShipmentTrackingUpdate | null {
  if (!data.tracking_number) return null;
  const status = mapShippoStatus(data.tracking_status?.status);
  const occurredAt =
    data.tracking_status?.status_date ?? new Date().toISOString();
  const out: ShipmentTrackingUpdate = {
    status,
    occurredAt: new Date(occurredAt).toISOString(),
    description: data.tracking_status?.status_details,
  };
  if (status === 'delivered') out.deliveredAt = out.occurredAt;
  if (data.eta) out.estimatedDeliveryAt = new Date(data.eta).toISOString();
  return out;
}
