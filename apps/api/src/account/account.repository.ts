import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AccountProfileDto,
  Locale,
  SaveAddressInput,
  SavedAddressDto,
} from '@custom-merch/shared';

/**
 * Anonymous-session profile + addresses store. The MVP uses the cart
 * session id as the user id; profile and address state survive in memory
 * for the life of the API process.
 */
@Injectable()
export class AccountRepository {
  private readonly profilesBySession = new Map<string, AccountProfileDto>();
  private readonly addressesBySession = new Map<string, SavedAddressDto[]>();

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
    return next;
  }

  removeAddress(sessionId: string, id: string): boolean {
    const list = this.addressesBySession.get(sessionId) ?? [];
    const next = list.filter((a) => a.id !== id);
    if (next.length === list.length) return false;
    this.addressesBySession.set(sessionId, next);
    return true;
  }

  setProfileLocale(sessionId: string, locale: Locale): void {
    this.updateProfile(sessionId, { locale });
  }
}
