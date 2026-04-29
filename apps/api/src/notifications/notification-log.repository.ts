import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { Locale, NotificationChannel } from '@custom-merch/shared';

import { readIfPrismaAvailable, runIfPrismaAvailable } from '../_lib/prisma-sink';

export type NotificationLogStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface NotificationLogEntry {
  id: string;
  recipientUserId: string | null;
  recipientAddress: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: Locale;
  variables: Record<string, unknown> | null;
  status: NotificationLogStatus;
  subject: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  sentAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  orderId: string | null;
  rfqId: string | null;
  quoteId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListFilter {
  status?: NotificationLogStatus;
  templateKey?: string;
  orderId?: string;
  rfqId?: string;
  quoteId?: string;
  limit?: number;
}

const MAX_IN_MEMORY = 500;

/**
 * Holds notification audit rows.
 *
 * The in-memory ring buffer is the source of truth for the dev / CI pipeline
 * and the read surface for the admin "Notification log" screen. When Prisma
 * is configured, every write is mirrored to `notification_logs` via
 * {@link runIfPrismaAvailable}, and the buffer is primed from the table at
 * boot so a restarted process surfaces history.
 */
@Injectable()
export class NotificationLogRepository implements OnModuleInit {
  private readonly log = new Logger(NotificationLogRepository.name);
  private readonly entries: NotificationLogEntry[] = [];
  private readonly byId = new Map<string, NotificationLogEntry>();

  async onModuleInit(): Promise<void> {
    const rows = await readIfPrismaAvailable('notificationLog:prime', async (client) => {
      return (await client.notificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_IN_MEMORY,
      })) as PrismaRow[];
    });
    if (!rows) return;
    this.entries.length = 0;
    this.byId.clear();
    for (const row of rows.reverse()) {
      const entry = rowToEntry(row);
      this.entries.push(entry);
      this.byId.set(entry.id, entry);
    }
    this.log.log(`primed ${this.entries.length} notification logs from Prisma`);
  }

  /** Insert a fresh row in `pending` state. Returns the assigned id. */
  create(input: {
    recipientAddress: string;
    recipientUserId?: string | null;
    channel: NotificationChannel;
    templateKey: string;
    locale: Locale;
    subject?: string | null;
    provider?: string | null;
    variables?: Record<string, unknown> | null;
    orderId?: string | null;
    rfqId?: string | null;
    quoteId?: string | null;
  }): NotificationLogEntry {
    const now = new Date().toISOString();
    const entry: NotificationLogEntry = {
      id: randomUUID(),
      recipientUserId: input.recipientUserId ?? null,
      recipientAddress: input.recipientAddress,
      channel: input.channel,
      templateKey: input.templateKey,
      locale: input.locale,
      variables: input.variables ?? null,
      status: 'pending',
      subject: input.subject ?? null,
      provider: input.provider ?? null,
      providerMessageId: null,
      attemptCount: 0,
      sentAt: null,
      failedAt: null,
      failureReason: null,
      orderId: input.orderId ?? null,
      rfqId: input.rfqId ?? null,
      quoteId: input.quoteId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.put(entry);
    persist(entry, /* isCreate */ true);
    return entry;
  }

  /** Patch an existing row. No-op when the id isn't tracked locally. */
  update(id: string, patch: Partial<NotificationLogEntry>): NotificationLogEntry | undefined {
    const existing = this.byId.get(id);
    if (!existing) return undefined;
    const next: NotificationLogEntry = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.put(next);
    persist(next, /* isCreate */ false);
    return next;
  }

  list(filter: ListFilter = {}): NotificationLogEntry[] {
    let rows = [...this.entries].reverse();
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter.templateKey) rows = rows.filter((r) => r.templateKey === filter.templateKey);
    if (filter.orderId) rows = rows.filter((r) => r.orderId === filter.orderId);
    if (filter.rfqId) rows = rows.filter((r) => r.rfqId === filter.rfqId);
    if (filter.quoteId) rows = rows.filter((r) => r.quoteId === filter.quoteId);
    return rows.slice(0, filter.limit ?? 100);
  }

  get(id: string): NotificationLogEntry | undefined {
    return this.byId.get(id);
  }

  /** Test-only — drop in-memory state. */
  __resetForTests(): void {
    this.entries.length = 0;
    this.byId.clear();
  }

  private put(entry: NotificationLogEntry): void {
    if (this.byId.has(entry.id)) {
      const idx = this.entries.findIndex((e) => e.id === entry.id);
      if (idx >= 0) this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
      if (this.entries.length > MAX_IN_MEMORY) {
        const dropped = this.entries.shift();
        if (dropped) this.byId.delete(dropped.id);
      }
    }
    this.byId.set(entry.id, entry);
  }
}

interface PrismaRow {
  id: string;
  recipientUserId: string | null;
  recipientAddress: string;
  channel: string;
  templateKey: string;
  locale: string;
  variables: Record<string, unknown> | null;
  status: string;
  subject: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  sentAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  orderId: string | null;
  rfqId: string | null;
  quoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function rowToEntry(row: PrismaRow): NotificationLogEntry {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    recipientAddress: row.recipientAddress,
    channel: row.channel as NotificationChannel,
    templateKey: row.templateKey,
    locale: row.locale as Locale,
    variables: row.variables,
    status: row.status as NotificationLogStatus,
    subject: row.subject,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    attemptCount: row.attemptCount,
    sentAt: row.sentAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    orderId: row.orderId,
    rfqId: row.rfqId,
    quoteId: row.quoteId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function persist(entry: NotificationLogEntry, isCreate: boolean): void {
  const payload = {
    id: entry.id,
    recipientUserId: entry.recipientUserId ?? undefined,
    recipientAddress: entry.recipientAddress,
    channel: entry.channel,
    templateKey: entry.templateKey,
    locale: entry.locale,
    variables: entry.variables ?? undefined,
    status: entry.status,
    subject: entry.subject ?? undefined,
    provider: entry.provider ?? undefined,
    providerMessageId: entry.providerMessageId ?? undefined,
    attemptCount: entry.attemptCount,
    sentAt: entry.sentAt ? new Date(entry.sentAt) : null,
    failedAt: entry.failedAt ? new Date(entry.failedAt) : null,
    failureReason: entry.failureReason ?? undefined,
    orderId: entry.orderId ?? undefined,
    rfqId: entry.rfqId ?? undefined,
    quoteId: entry.quoteId ?? undefined,
  };
  runIfPrismaAvailable('notificationLog', (client) =>
    isCreate
      ? client.notificationLog.create({ data: payload })
      : client.notificationLog.update({ where: { id: entry.id }, data: payload }),
  );
}
