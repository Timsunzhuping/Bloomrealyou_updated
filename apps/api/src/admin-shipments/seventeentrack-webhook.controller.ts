import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import type { ShipmentTrackingUpdate } from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { applyTrackingUpdate, mapSeventeentrackStatus } from './webhook-shared';

/**
 * 17track ({@link https://api.17track.net/en/doc/v2.2}) push receiver.
 *
 * 17track signs each push with `MD5(body + secret)` in the `event` field of
 * the body envelope. We compare in constant-ish time. The push payload
 * differs from the pull API: it carries `event`, `data` (one tracking
 * record), `data.track_info.latest_event.time_iso` for ordering.
 */
@Controller('webhooks/17track')
export class SeventeentrackWebhookController {
  private readonly log = new Logger(SeventeentrackWebhookController.name);

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
    @Body() body: SeventeentrackEnvelope,
  ): Promise<{ ok: true; updatedShipmentId?: string; deduped?: true }> {
    this.verifySignature(body);

    const data = body.data;
    if (!data?.number) {
      throw new BadRequestException('Missing data.number');
    }

    const lastEvent = data.track_info?.latest_event;
    const eventTime = lastEvent?.time_iso ?? lastEvent?.time_utc ?? '';
    const key = `17track:${data.number}:${eventTime}`;
    if (!this.idempotency.claim(key)) {
      this.log.log(`Dedup hit for ${key}`);
      return { ok: true, deduped: true };
    }

    const update = normalize(data);
    if (!update) return { ok: true };

    const updatedShipmentId = applyTrackingUpdate({
      source: '17track',
      trackingNumber: data.number,
      carrier: data.carrier_code ?? null,
      update,
      shipments: this.shipments,
      orders: this.orders,
      audit: this.audit,
      log: this.log,
    });
    return { ok: true, updatedShipmentId: updatedShipmentId ?? undefined };
  }

  private verifySignature(body: SeventeentrackEnvelope): void {
    const secret = this.config.get<string>('SEVENTEENTRACK_WEBHOOK_SECRET');
    if (!secret) {
      this.log.warn('SEVENTEENTRACK_WEBHOOK_SECRET not set — skipping signature verification');
      return;
    }
    if (!body.event) {
      throw new ForbiddenException('Missing event signature');
    }
    // 17track's docs show MD5(`${data}${secret}`) over the raw payload, but
    // the most common deployment computes MD5(JSON.stringify(data) + secret).
    // We accept either: try both before rejecting.
    const dataString = JSON.stringify(body.data ?? {});
    const candidates = [
      createHash('md5').update(dataString + secret).digest('hex'),
      createHash('md5').update(dataString).update(secret).digest('hex'),
    ];
    if (!candidates.includes(body.event)) {
      throw new ForbiddenException('Invalid webhook signature');
    }
  }
}

interface SeventeentrackEnvelope {
  event?: string;
  data?: {
    number?: string;
    carrier_code?: string | null;
    track_info?: {
      latest_status?: { status?: string };
      latest_event?: {
        time_iso?: string;
        time_utc?: string;
        description?: string;
      };
      time_metrics?: {
        estimated_delivery_date?: { from?: string; to?: string };
      };
    };
  };
}

function normalize(
  data: NonNullable<SeventeentrackEnvelope['data']>,
): ShipmentTrackingUpdate | null {
  const info = data.track_info;
  if (!info) return null;
  const status = mapSeventeentrackStatus(info.latest_status?.status);
  const occurredAt =
    info.latest_event?.time_iso ?? info.latest_event?.time_utc ?? new Date().toISOString();
  const out: ShipmentTrackingUpdate = {
    status,
    occurredAt: new Date(occurredAt).toISOString(),
    description: info.latest_event?.description,
  };
  if (status === 'delivered') out.deliveredAt = out.occurredAt;
  const eta = info.time_metrics?.estimated_delivery_date?.to;
  if (eta) out.estimatedDeliveryAt = new Date(eta).toISOString();
  return out;
}
