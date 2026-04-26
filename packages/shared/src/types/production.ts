import type { PrintMethod } from '../constants/print-methods';
import type { ProductionJobStatus, ShipmentStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Money, Timestamps } from './common';
import type { OrderId, OrderItemId } from './order';
import type { SupplierId } from './supplier';

export type ProductionJobId = Brand<string, 'ProductionJobId'>;
export type ShipmentId = Brand<string, 'ShipmentId'>;
/** Human-readable production job number (e.g. `JOB-20260426-A7BC92`). */
export type ProductionJobNumber = Brand<string, 'ProductionJobNumber'>;

/**
 * A production-floor unit of work. One order item may map to one or more
 * jobs (e.g. multi-region splitting); one job covers exactly one supplier.
 */
export interface ProductionJob extends Timestamps {
  id: ProductionJobId;
  jobNumber: ProductionJobNumber;
  orderId: OrderId;
  /** Order items this job fulfils (a job can group items going to the same supplier). */
  orderItemIds: OrderItemId[];
  supplierId?: SupplierId | null;
  printMethod: PrintMethod;
  status: ProductionJobStatus;
  /** Quantity produced under this job (sum of underlying order item quantities). */
  quantity: number;
  /** Supplier cost paid out for this job (sum). */
  supplierCost?: Money;
  /** ETA committed by the supplier. */
  expectedReadyAt?: IsoDateString | null;
  startedAt?: IsoDateString | null;
  completedAt?: IsoDateString | null;
  /** QA notes from the production manager. */
  qcNotes?: string;
  /** Reason captured when status === 'failed'. */
  failureReason?: string | null;
}

export interface Shipment extends Timestamps {
  id: ShipmentId;
  orderId: OrderId;
  /** Production jobs whose finished goods are bundled into this shipment. */
  productionJobIds: ProductionJobId[];
  carrier: string;
  serviceLevel?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  /** Snapshot of the destination address at shipment creation. */
  shippedAt?: IsoDateString | null;
  estimatedDeliveryAt?: IsoDateString | null;
  deliveredAt?: IsoDateString | null;
  shippingCost?: Money;
  /** Optional weight & dim info captured for label generation. */
  packageWeightGrams?: number;
}
