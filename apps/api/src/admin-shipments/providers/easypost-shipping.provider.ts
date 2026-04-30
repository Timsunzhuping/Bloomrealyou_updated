import { Injectable, Logger } from '@nestjs/common';

import type {
  ShipmentStatus,
  ShipmentTrackingUpdate,
  ShippingProvider,
  TrackingLookupInput,
} from '@custom-merch/shared';

/**
 * EasyPost tracker adapter. We deliberately keep the surface tiny and read-only:
 * the platform creates trackers lazily from the existing `(carrier, trackingNumber)`
 * pair recorded by admins, then polls EasyPost via this provider.
 *
 * EasyPost statuses → platform statuses:
 *   pre_transit / unknown        → pending
 *   in_transit                   → in_transit
 *   out_for_delivery             → out_for_delivery
 *   delivered                    → delivered
 *   return_to_sender             → returned
 *   failure / error              → failed
 *
 * Network failures resolve to `null` so the caller falls back to the previous
 * status — never escalate carrier flakiness into a 500.
 */
@Injectable()
export class EasyPostShippingProvider implements ShippingProvider {
  readonly name = 'easypost' as const;
  private readonly log = new Logger(EasyPostShippingProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.easypost.com/v2',
  ) {}

  async fetchTrackingUpdate(input: TrackingLookupInput): Promise<ShipmentTrackingUpdate | null> {
    if (!input.trackingNumber) return null;

    const params = new URLSearchParams();
    params.set('tracking_code', input.trackingNumber);
    if (input.carrier) params.set('carrier', mapCarrierName(input.carrier));

    const url = `${this.baseUrl}/trackers?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
          accept: 'application/json',
        },
      });
      if (!res.ok) {
        this.log.warn(`EasyPost ${res.status} for ${input.trackingNumber}`);
        return null;
      }
      const body = (await res.json()) as { trackers?: EasyPostTracker[] };
      const tracker = body.trackers?.[0];
      if (!tracker) return null;
      return normalize(tracker);
    } catch (e) {
      this.log.warn(`EasyPost fetch failed: ${(e as Error).message}`);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/trackers?per_page=1`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

interface EasyPostTracker {
  status: string;
  est_delivery_date?: string | null;
  updated_at?: string;
  tracking_details?: Array<{
    status?: string;
    message?: string;
    datetime?: string;
  }>;
}

function normalize(tracker: EasyPostTracker): ShipmentTrackingUpdate {
  const lastEvent = tracker.tracking_details?.[tracker.tracking_details.length - 1];
  const occurredAt = lastEvent?.datetime ?? tracker.updated_at ?? new Date().toISOString();
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

/** Translate our human carrier strings into EasyPost's enum (best-effort). */
function mapCarrierName(carrier: string): string {
  const c = carrier.toLowerCase();
  if (c.includes('dhl')) return 'DHL';
  if (c.includes('ups')) return 'UPS';
  if (c.includes('fedex')) return 'FedEx';
  if (c.includes('usps')) return 'USPS';
  if (c.includes('royal') || c.includes('royalmail')) return 'RoyalMail';
  return carrier;
}
