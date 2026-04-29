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
import { applyTrackingUpdate, mapEasyPostStatus } from './webhook-shared';

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

interface EasyPostWebhookEnvelope {
  description?: string;
  result?: EasyPostTracker;
}

interface EasyPostTracker {
  id?: string;
  tracking_code?: string;
  carrier?: string;
  status?: string;
  est_delivery_date?: string | null;
  updated_at?: string;
  tracking_details?: Array<{
    status?: string;
    message?: string;
    datetime?: string;
  }>;
}

/**
 * Anonymous EasyPost webhook receiver.
 *
 * `X-Hmac-Signature` is hex-encoded HMAC-SHA-256 of the raw body using
 * `EASYPOST_WEBHOOK_SECRET`. The {@link WebhookIdempotencyService} dedups by
 * `(tracker_id, updated_at)` so EasyPost retries don't replay state changes.
 */
@Controller('webhooks/easypost')
@UseGuards(WebhookRateLimiterGuard)
export class EasyPostWebhookController {
  private readonly log = new Logger(EasyPostWebhookController.name);

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
    @Body() body: EasyPostWebhookEnvelope,
    @Req() req: RequestWithRawBody,
  ): Promise<{ ok: true; updatedShipmentId?: string; deduped?: true }> {
    this.verifySignature(req);

    const tracker = body.result;
    if (!tracker?.tracking_code) {
      throw new BadRequestException('Missing tracker.tracking_code');
    }

    // Idempotency. EasyPost retries the same tracker.updated event with the
    // same `id` + `updated_at` until it sees a 2xx; reject duplicates here so
    // a slow downstream operation doesn't end up processed twice.
    const key = `easypost:${tracker.id ?? tracker.tracking_code}:${tracker.updated_at ?? ''}`;
    if (!(await this.idempotency.claim(key))) {
      this.log.log(`Dedup hit for ${key}`);
      return { ok: true, deduped: true };
    }

    const update = normalize(tracker);
    if (!update) return { ok: true };

    const updatedShipmentId = applyTrackingUpdate({
      source: 'easypost',
      trackingNumber: tracker.tracking_code,
      carrier: tracker.carrier,
      update,
      shipments: this.shipments,
      orders: this.orders,
      audit: this.audit,
      log: this.log,
    });
    return { ok: true, updatedShipmentId: updatedShipmentId ?? undefined };
  }

  private verifySignature(req: RequestWithRawBody): void {
    const secret = this.config.get<string>('EASYPOST_WEBHOOK_SECRET');
    if (!secret) {
      this.log.warn('EASYPOST_WEBHOOK_SECRET not set — skipping signature verification');
      return;
    }
    const headerValue = req.headers['x-hmac-signature'];
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

function normalize(tracker: EasyPostTracker): ShipmentTrackingUpdate | null {
  const lastEvent = tracker.tracking_details?.[tracker.tracking_details.length - 1];
  const occurredAt =
    lastEvent?.datetime ?? tracker.updated_at ?? new Date().toISOString();
  const status = mapEasyPostStatus(tracker.status);
  const out: ShipmentTrackingUpdate = {
    status,
    occurredAt: new Date(occurredAt).toISOString(),
    description: lastEvent?.message,
  };
  if (status === 'delivered') out.deliveredAt = out.occurredAt;
  if (tracker.est_delivery_date) {
    out.estimatedDeliveryAt = new Date(tracker.est_delivery_date).toISOString();
  }
  return out;
}
