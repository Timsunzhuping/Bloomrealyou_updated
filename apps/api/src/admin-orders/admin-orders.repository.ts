import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AdminOrderDetailExtras, AdminOrderNote } from '@custom-merch/shared';

interface InternalState {
  notes: AdminOrderNote[];
  isFlaggedException: boolean;
}

/**
 * Side-table for the admin-only fields on an order: internal notes and the
 * "flagged as exception" toggle. Kept separate from the customer-facing
 * `OrderDto` so customer reads never accidentally surface internal commentary.
 */
@Injectable()
export class AdminOrdersExtrasRepository {
  private readonly extras = new Map<string, InternalState>();

  get(orderId: string): AdminOrderDetailExtras {
    const state = this.extras.get(orderId);
    return {
      internalNotes: state?.notes ?? [],
      isFlaggedException: state?.isFlaggedException ?? false,
    };
  }

  appendNote(
    orderId: string,
    body: string,
    author: { id: string; fullName: string },
  ): AdminOrderNote {
    const note: AdminOrderNote = {
      id: randomUUID(),
      authorUserId: author.id,
      authorName: author.fullName,
      body,
      createdAt: new Date().toISOString(),
    };
    const state = this.extras.get(orderId) ?? { notes: [], isFlaggedException: false };
    state.notes = [note, ...state.notes];
    this.extras.set(orderId, state);
    return note;
  }

  setFlagged(orderId: string, isFlagged: boolean): void {
    const state = this.extras.get(orderId) ?? { notes: [], isFlaggedException: false };
    state.isFlaggedException = isFlagged;
    this.extras.set(orderId, state);
  }
}
