import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  AdminShipmentDto,
  ShipmentStatus,
  ShipmentTrackingUpdate,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

interface EasyPostWebhookEnvelope {
  description?: string;
  result?: EasyPostTracker;
}

interface EasyPostTracker {
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
 * EasyPost POSTs `tracker.updated` events to the URL configured under their
 * webhook settings. Each request carries an `X-Hmac-Signature` header that
 * is the hex-encoded HMAC-SHA-256 of the *raw* request body using the
 * webhook's secret. We verify in constant time.
 *
 * The endpoint matches an existing shipment by `(carrier, trackingNumber)`,
 * normalises the status into our enum, applies the change, and writes an
 * audit-log entry with `actorUserId = null` and `payload.source = 'easypost-webhook'`.
 *
 * When `EASYPOST_WEBHOOK_SECRET` is unset we still process the payload but
 * log a warning — useful in dev where you point EasyPost at ngrok and don't
 * want to copy the secret around. Configure the secret in production.
 */
@Controller('webhooks/easypost')
export class EasyPostWebhookController {
  private readonly log = new Logger(EasyPostWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly shipments: AdminShipmentsRepository,
    private readonly orders: OrdersRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  /** POST /webhooks/easypost */
  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: EasyPostWebhookEnvelope,
    @Req() req: RequestWithRawBody,
  ): Promise<{ ok: true; updatedShipmentId?: string }> {
    this.verifySignature(req);

    const tracker = body.result;
    if (!tracker?.tracking_code) {
      throw new BadRequestException('Missing tracker.tracking_code');
    }

    const shipment = this.findShipment(tracker.tracking_code, tracker.carrier);
    if (!shipment) {
      // Webhook for an unknown tracker — ack so EasyPost stops retrying.
      this.log.warn(`No shipment found for tracking ${tracker.tracking_code}`);
      return { ok: true };
    }

    const update = normalize(tracker);
    if (!update) return { ok: true, updatedShipmentId: shipment.id };

    const previous = shipment.status;
    const patch: Partial<AdminShipmentDto> = { status: update.status };
    if (update.deliveredAt) patch.deliveredAt = update.deliveredAt;
    if (update.estimatedDeliveryAt) patch.estimatedDeliveryAt = update.estimatedDeliveryAt;
    if (
      !shipment.shippedAt &&
      (update.status === 'in_transit' ||
        update.status === 'out_for_delivery' ||
        update.status === 'delivered')
    ) {
      patch.shippedAt = update.occurredAt;
    }

    const next = this.shipments.update(shipment.id, patch);
    if (!next) return { ok: true };

    if (update.status === 'in_transit' || update.status === 'out_for_delivery') {
      this.orders.setStatus(next.orderId, 'shipped');
    } else if (update.status === 'delivered') {
      this.orders.setStatus(next.orderId, 'delivered');
    }

    if (previous !== update.status) {
      this.audit.append({
        actorUserId: null,
        actorName: 'easypost-webhook',
        entityType: 'Shipment',
        entityId: next.id,
        action: 'status_change',
        payload: {
          source: 'easypost-webhook',
          from: previous,
          to: update.status,
          description: update.description,
        },
        summary: `${next.shipmentNumber}: ${previous} → ${update.status} (webhook)`,
      });
    }

    return { ok: true, updatedShipmentId: next.id };
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

  /** Match by trackingNumber and (when provided) carrier. */
  private findShipment(trackingNumber: string, carrier?: string): AdminShipmentDto | undefined {
    const result = this.shipments.list({ q: trackingNumber, pageSize: 5 });
    const matches = result.items.filter((s) => s.trackingNumber === trackingNumber);
    if (matches.length === 0) return undefined;
    if (matches.length === 1) return matches[0];
    if (!carrier) return matches[0];
    return matches.find((s) => (s.carrier ?? '').toLowerCase().includes(carrier.toLowerCase())) ?? matches[0];
  }
}

function normalize(tracker: EasyPostTracker): ShipmentTrackingUpdate | null {
  const lastEvent = tracker.tracking_details?.[tracker.tracking_details.length - 1];
  const occurredAt =
    lastEvent?.datetime ?? tracker.updated_at ?? new Date().toISOString();
  const status = mapStatus(tracker.status);
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

function mapStatus(s: string | undefined): ShipmentStatus {
  switch (s) {
    case 'pre_transit':
    case 'unknown':
      return 'pending';
    case 'in_transit':
      return 'in_transit';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'return_to_sender':
      return 'returned';
    case 'failure':
    case 'error':
      return 'failed';
    default:
      return 'in_transit';
  }
}
