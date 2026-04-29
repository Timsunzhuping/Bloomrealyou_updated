import { Injectable } from '@nestjs/common';

import type {
  ShipmentTrackingUpdate,
  ShippingProvider,
  TrackingLookupInput,
} from '@custom-merch/shared';

/**
 * Deterministic, network-free carrier simulator.
 *
 *   t < 12 h after `shippedAt` → in_transit
 *   t in [12 h, 36 h)         → out_for_delivery
 *   t ≥ 36 h                  → delivered
 *
 * Returning `null` when no `trackingNumber` is supplied lets the calling
 * service short-circuit without writing a status change.
 */
@Injectable()
export class MockShippingProvider implements ShippingProvider {
  readonly name = 'mock' as const;

  async fetchTrackingUpdate(input: TrackingLookupInput): Promise<ShipmentTrackingUpdate | null> {
    if (!input.trackingNumber) return null;
    const shippedAt = input.shippedAt ? new Date(input.shippedAt).getTime() : Date.now();
    const elapsedMs = Math.max(0, Date.now() - shippedAt);
    const HOUR = 60 * 60 * 1000;

    if (elapsedMs < 12 * HOUR) {
      return {
        status: 'in_transit',
        occurredAt: new Date().toISOString(),
        description: `${input.carrier ?? 'Mock'}: package picked up`,
      };
    }
    if (elapsedMs < 36 * HOUR) {
      return {
        status: 'out_for_delivery',
        occurredAt: new Date().toISOString(),
        description: `${input.carrier ?? 'Mock'}: out for delivery`,
        estimatedDeliveryAt: new Date(shippedAt + 36 * HOUR).toISOString(),
      };
    }
    return {
      status: 'delivered',
      occurredAt: new Date().toISOString(),
      deliveredAt: new Date(shippedAt + 36 * HOUR).toISOString(),
      description: `${input.carrier ?? 'Mock'}: delivered`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
