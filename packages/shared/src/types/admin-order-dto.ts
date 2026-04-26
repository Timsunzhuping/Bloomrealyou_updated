import type { OrderStatus } from '../constants/statuses';

/** Internal note attached to an order by an admin user. */
export interface AdminOrderNote {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

/** Body for PATCH /admin/orders/:id/status. */
export interface AdminOrderStatusUpdateInput {
  status: OrderStatus;
  /** Optional internal note appended atomically with the status change. */
  note?: string;
  /** When true, marks the order as an exception even if status is not `exception`. */
  flagException?: boolean;
}

/** Body for POST /admin/orders/:id/notes. */
export interface AdminOrderNoteInput {
  body: string;
}

/** Wire shape returned by `GET /admin/orders/:id` (extends the customer-facing OrderDto). */
export interface AdminOrderDetailExtras {
  internalNotes: AdminOrderNote[];
  /** True when admin has flagged the order as exceptional regardless of status. */
  isFlaggedException: boolean;
}
