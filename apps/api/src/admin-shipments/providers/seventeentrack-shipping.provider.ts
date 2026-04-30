import { Injectable, Logger } from '@nestjs/common';

import type {
  ShipmentStatus,
  ShipmentTrackingUpdate,
  ShippingProvider,
  TrackingLookupInput,
} from '@custom-merch/shared';

/**
 * 17track ({@link https://api.17track.net/en/doc/v2.2}) tracker adapter.
 *
 * 17track uses one-shot lookups: `POST /track/v2.2/gettrackinfo` with a JSON
 * body listing `{ number, carrier? }` and a `17token` header. The response
 * carries `latest_event` + `track_info.latest_status.status` (e.g.
 * `InTransit | Delivered | OutForDelivery | Exception | Pickup`).
 *
 * Carrier mapping uses 17track's numeric IDs when known; the API is permissive
 * and will auto-detect when the carrier is omitted, so we leave it null when
 * we can't translate.
 */
@Injectable()
export class SeventeentrackShippingProvider implements ShippingProvider {
  readonly name = '17track' as const;
  private readonly log = new Logger(SeventeentrackShippingProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.17track.net',
  ) {}

  async fetchTrackingUpdate(input: TrackingLookupInput): Promise<ShipmentTrackingUpdate | null> {
    if (!input.trackingNumber) return null;

    const body = [
      {
        number: input.trackingNumber,
        carrier: mapCarrierId(input.carrier),
      },
    ];

    try {
      const res = await fetch(`${this.baseUrl}/track/v2.2/gettrackinfo`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          '17token': this.apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.log.warn(`17track ${res.status} for ${input.trackingNumber}`);
        return null;
      }
      const payload = (await res.json()) as SeventeentrackResponse;
      const accepted = payload.data?.accepted?.[0];
      if (!accepted) return null;
      return normalize(accepted);
    } catch (e) {
      this.log.warn(`17track fetch failed: ${(e as Error).message}`);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 17track exposes /carrier/getlist as a low-cost ping.
      const res = await fetch(`${this.baseUrl}/track/v2.2/getlist`, {
        method: 'POST',
        headers: { '17token': this.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify([]),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

interface SeventeentrackResponse {
  data?: {
    accepted?: Array<{
      number: string;
      track_info?: {
        latest_status?: { status?: string; sub_status?: string };
        latest_event?: {
          time_iso?: string;
          time_utc?: string;
          description?: string;
        };
        time_metrics?: {
          estimated_delivery_date?: { from?: string; to?: string };
        };
      };
    }>;
  };
}

function normalize(
  accepted: NonNullable<NonNullable<SeventeentrackResponse['data']>['accepted']>[number],
): ShipmentTrackingUpdate | null {
  const info = accepted.track_info;
  if (!info) return null;

  const status = mapStatus(info.latest_status?.status);
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

function mapStatus(s: string | undefined): ShipmentStatus {
  switch ((s ?? '').toLowerCase()) {
    case 'notfound':
    case 'inforeceived':
    case 'pickup':
      return 'pending';
    case 'intransit':
      return 'in_transit';
    case 'outfordelivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'exception':
      return 'failed';
    case 'expired':
      return 'returned';
    default:
      return 'in_transit';
  }
}

const CARRIER_ID_TABLE: Record<string, number> = {
  dhl: 100002,
  ups: 100001,
  fedex: 100003,
  usps: 100002,
  'china-post': 3011,
  'royal-mail': 11031,
};

function mapCarrierId(carrier: string | null | undefined): number | null {
  if (!carrier) return null;
  const key = carrier.toLowerCase().replace(/\s+/g, '-');
  return CARRIER_ID_TABLE[key] ?? null;
}
