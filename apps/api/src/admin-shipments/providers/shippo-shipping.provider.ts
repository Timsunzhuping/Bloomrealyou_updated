import { Injectable, Logger } from '@nestjs/common';

import type {
  ShipmentStatus,
  ShipmentTrackingUpdate,
  ShippingProvider,
  TrackingLookupInput,
} from '@custom-merch/shared';

/**
 * Shippo ({@link https://goshippo.com/docs/reference#tracks}) tracker adapter.
 *
 * Shippo's tracker endpoint is `GET /v1/tracks/{carrier}/{tracking_number}`
 * with `Authorization: ShippoToken <api_key>`. Carrier names are lowercase
 * (`dhl_express`, `ups`, `usps`, `fedex`, ...). The response contains
 * `tracking_status.status`, `eta`, and a `tracking_history[]` event list.
 */
@Injectable()
export class ShippoShippingProvider implements ShippingProvider {
  readonly name = 'shippo' as const;
  private readonly log = new Logger(ShippoShippingProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.goshippo.com',
  ) {}

  async fetchTrackingUpdate(input: TrackingLookupInput): Promise<ShipmentTrackingUpdate | null> {
    if (!input.trackingNumber) return null;
    const carrier = mapCarrier(input.carrier);

    try {
      const res = await fetch(
        `${this.baseUrl}/v1/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(input.trackingNumber)}`,
        {
          headers: {
            Authorization: `ShippoToken ${this.apiKey}`,
            accept: 'application/json',
          },
        },
      );
      if (!res.ok) {
        this.log.warn(`Shippo ${res.status} for ${input.trackingNumber}`);
        return null;
      }
      const body = (await res.json()) as ShippoTracker;
      return normalize(body);
    } catch (e) {
      this.log.warn(`Shippo fetch failed: ${(e as Error).message}`);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/carrier_accounts?results=1`, {
        headers: { Authorization: `ShippoToken ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

interface ShippoTracker {
  tracking_status?: {
    status?: string;
    status_date?: string;
    status_details?: string;
  };
  eta?: string;
}

function normalize(tracker: ShippoTracker): ShipmentTrackingUpdate {
  const status = mapStatus(tracker.tracking_status?.status);
  const occurredAt =
    tracker.tracking_status?.status_date ?? new Date().toISOString();
  const out: ShipmentTrackingUpdate = {
    status,
    occurredAt: new Date(occurredAt).toISOString(),
    description: tracker.tracking_status?.status_details,
  };
  if (status === 'delivered') out.deliveredAt = out.occurredAt;
  if (tracker.eta) out.estimatedDeliveryAt = new Date(tracker.eta).toISOString();
  return out;
}

function mapStatus(s: string | undefined): ShipmentStatus {
  switch ((s ?? '').toUpperCase()) {
    case 'PRE_TRANSIT':
    case 'UNKNOWN':
      return 'pending';
    case 'TRANSIT':
      return 'in_transit';
    case 'DELIVERED':
      return 'delivered';
    case 'RETURNED':
      return 'returned';
    case 'FAILURE':
      return 'failed';
    default:
      return 'in_transit';
  }
}

function mapCarrier(carrier: string | null | undefined): string {
  if (!carrier) return 'shippo';
  const key = carrier.toLowerCase();
  if (key.includes('dhl')) return 'dhl_express';
  if (key.includes('ups')) return 'ups';
  if (key.includes('fedex')) return 'fedex';
  if (key.includes('usps')) return 'usps';
  if (key.includes('royal')) return 'royal_mail';
  return key;
}
