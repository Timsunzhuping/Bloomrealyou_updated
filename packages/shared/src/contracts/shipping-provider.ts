import type { IsoDateString } from '../types/common';
import type { ShipmentStatus } from '../constants/statuses';

/**
 * Carrier-tracking adapter contract.
 *
 * Two implementations ship with the platform:
 *   - `MockShippingProvider` — deterministic, no network. Auto-progresses a
 *     shipment from `in_transit` → `out_for_delivery` → `delivered` based on
 *     elapsed wall-clock time so end-to-end demos work offline.
 *   - `EasyPostShippingProvider` — calls EasyPost's tracker endpoint when
 *     `EASYPOST_API_KEY` is set. The wire format is normalised back into
 *     {@link ShipmentTrackingUpdate} so the rest of the system stays
 *     carrier-agnostic.
 *
 * Future carriers (17track, Shippo, FedEx) plug in without changing the
 * ShippingService.
 */
export interface ShippingProvider {
  readonly name: ShippingProviderName;
  /**
   * Read the latest carrier event for a shipment. Implementations MUST tolerate
   * unknown carrier / tracking values (return null) and MUST NOT throw on
   * upstream HTTP failures — the caller will downgrade to "no update".
   */
  fetchTrackingUpdate(input: TrackingLookupInput): Promise<ShipmentTrackingUpdate | null>;

  /** Optional health check. Returns false (not throws) when the carrier API is
   *  unreachable so the boot factory can fall back to the mock provider. */
  healthCheck?(): Promise<boolean>;
}

export interface TrackingLookupInput {
  carrier?: string | null;
  trackingNumber: string;
  /** Original shipment creation time — used by the mock provider to advance
   *  the simulated state machine. */
  shippedAt?: IsoDateString | null;
}

export interface ShipmentTrackingUpdate {
  status: ShipmentStatus;
  /** Most-recent event timestamp from the carrier. */
  occurredAt: IsoDateString;
  /** Free-form carrier-supplied description (e.g. "Out for delivery — Phoenix DC"). */
  description?: string;
  /** Set only when the carrier confirms delivery. */
  deliveredAt?: IsoDateString;
  /** Set only when an estimate is reported. */
  estimatedDeliveryAt?: IsoDateString;
}

/** Logical name of the active shipping provider. */
export type ShippingProviderName = 'mock' | 'easypost' | '17track' | 'shippo';
