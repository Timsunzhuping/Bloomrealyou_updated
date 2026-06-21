import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AdminOrderDetailExtras, AdminOrderNote } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'admin_order_extras';

interface InternalState {
  notes: AdminOrderNote[];
  isFlaggedException: boolean;
}

/**
 * Side-table for the admin-only fields on an order: internal notes and the
 * "flagged as exception" toggle. Kept separate from the customer-facing
 * `OrderDto` so customer reads never accidentally surface internal commentary.
 *
 * In-memory map made durable via the {@link SnapshotStore} so internal notes
 * and exception flags survive restarts.
 */
@Injectable()
export class AdminOrdersExtrasRepository implements OnModuleInit {
  private readonly log = new Logger(AdminOrdersExtrasRepository.name);
  private readonly extras = new Map<string, InternalState>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<InternalState>(KIND);
    for (const row of rows) {
      this.extras.set(row.entityId, row.data);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} admin order extras from durable store`);
    }
  }

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
    this.snapshots.put(KIND, orderId, state);
    return note;
  }

  setFlagged(orderId: string, isFlagged: boolean): void {
    const state = this.extras.get(orderId) ?? { notes: [], isFlaggedException: false };
    state.isFlaggedException = isFlagged;
    this.extras.set(orderId, state);
    this.snapshots.put(KIND, orderId, state);
  }
}
