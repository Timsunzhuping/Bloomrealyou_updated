import type { DesignStatus } from '../constants/statuses';

import type { CustomerDesignDto } from './customization-dto';

/**
 * What the admin design-review queue shows. Wraps the existing
 * {@link CustomerDesignDto} with the bits sales/ops actually need:
 * the linked order (if any) and the latest reviewer note.
 */
export interface AdminDesignReviewDto extends CustomerDesignDto {
  /** ID of the most recent order line that references this design, or null. */
  linkedOrderId?: string | null;
  linkedOrderNumber?: string | null;
  reviewerNotes?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
}

export interface ApproveDesignInput {
  /** Optional approval note recorded in the audit log. */
  note?: string;
}

export interface RejectDesignInput {
  /** Required — surfaced to the customer as the rejection reason. */
  reason: string;
  note?: string;
}

export interface RequestRevisionInput {
  /** What the customer needs to change. */
  message: string;
  note?: string;
}

export interface DesignReviewDecisionResult {
  design: AdminDesignReviewDto;
  /** Trail entry id that was just appended. */
  auditLogId: string;
  newStatus: DesignStatus;
}
