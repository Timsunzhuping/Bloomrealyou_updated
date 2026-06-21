import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AccountProfileDto,
  Locale,
  SaveAddressInput,
  SavedAddressDto,
} from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const PROFILE_KIND = 'account_profile';
const ADDRESS_KIND = 'account_addresses';

/**
 * Anonymous-session profile + addresses store. The MVP uses the cart
 * session id as the user id. In-memory maps are the runtime source of truth;
 * the {@link SnapshotStore} makes them durable across restarts.
 *
 * Writes go through on real mutations only (updateProfile / *Address) — a
 * bare read via {@link ensureProfile} does not persist an empty profile, so
 * casual browsing sessions don't bloat the durable store.
 */
@Injectable()
export class AccountRepository implements OnModuleInit {
  private readonly log = new Logger(AccountRepository.name);
  private readonly profilesBySession = new Map<string, AccountProfileDto>();
  private readonly addressesBySession = new Map<string, SavedAddressDto[]>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const profiles = await this.snapshots.loadAll<AccountProfileDto>(PROFILE_KIND);
    for (const row of profiles) {
      this.profilesBySession.set(row.entityId, row.data);
    }
    const addresses = await this.snapshots.loadAll<SavedAddressDto[]>(ADDRESS_KIND);
    for (const row of addresses) {
      this.addressesBySession.set(row.entityId, row.data);
    }
    if (profiles.length > 0 || addresses.length > 0) {
      this.log.log(
        `Primed ${profiles.length} profiles + ${addresses.length} address books from durable store`,
      );
    }
  }

  private persistAddresses(sessionId: string): void {
    this.snapshots.put(ADDRESS_KIND, sessionId, this.addressesBySession.get(sessionId) ?? []);
  }

  ensureProfile(sessionId: string): AccountProfileDto {
    let p = this.profilesBySession.get(sessionId);
    if (!p) {
      const now = new Date().toISOString();
      p = {
        id: sessionId,
        email: null,
        fullName: null,
        phone: null,
        locale: 'en',
        marketingOptIn: false,
        createdAt: now,
        updatedAt: now,
      };
      this.profilesBySession.set(sessionId, p);
    }
    return p;
  }

  updateProfile(sessionId: string, patch: Partial<AccountProfileDto>): AccountProfileDto {
    const existing = this.ensureProfile(sessionId);
    const next: AccountProfileDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.profilesBySession.set(sessionId, next);
    this.snapshots.put(PROFILE_KIND, sessionId, next);
    return next;
  }

  listAddresses(sessionId: string): SavedAddressDto[] {
    return this.addressesBySession.get(sessionId) ?? [];
  }

  saveAddress(sessionId: string, input: SaveAddressInput): SavedAddressDto {
    const list = this.addressesBySession.get(sessionId) ?? [];
    const now = new Date().toISOString();
    const dto: SavedAddressDto = {
      id: randomUUID(),
      label: input.label ?? null,
      fullName: input.fullName,
      company: input.company,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      phone: input.phone,
      isDefaultShipping: input.isDefaultShipping ?? list.length === 0,
      isDefaultBilling: input.isDefaultBilling ?? list.length === 0,
      createdAt: now,
      updatedAt: now,
    };
    if (dto.isDefaultShipping || dto.isDefaultBilling) {
      // Ensure only one default of each kind.
      for (const existing of list) {
        if (dto.isDefaultShipping) existing.isDefaultShipping = false;
        if (dto.isDefaultBilling) existing.isDefaultBilling = false;
      }
    }
    list.push(dto);
    this.addressesBySession.set(sessionId, list);
    this.persistAddresses(sessionId);
    return dto;
  }

  updateAddress(
    sessionId: string,
    id: string,
    patch: Partial<SaveAddressInput>,
  ): SavedAddressDto | undefined {
    const list = this.addressesBySession.get(sessionId) ?? [];
    const idx = list.findIndex((a) => a.id === id);
    if (idx < 0) return undefined;
    const existing = list[idx]!;
    const next: SavedAddressDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    if (patch.isDefaultShipping) {
      list.forEach((a) => {
        if (a.id !== id) a.isDefaultShipping = false;
      });
    }
    if (patch.isDefaultBilling) {
      list.forEach((a) => {
        if (a.id !== id) a.isDefaultBilling = false;
      });
    }
    list[idx] = next;
    this.persistAddresses(sessionId);
    return next;
  }

  removeAddress(sessionId: string, id: string): boolean {
    const list = this.addressesBySession.get(sessionId) ?? [];
    const next = list.filter((a) => a.id !== id);
    if (next.length === list.length) return false;
    this.addressesBySession.set(sessionId, next);
    this.persistAddresses(sessionId);
    return true;
  }

  setProfileLocale(sessionId: string, locale: Locale): void {
    this.updateProfile(sessionId, { locale });
  }
}
