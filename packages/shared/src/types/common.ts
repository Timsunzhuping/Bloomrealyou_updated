import type { Currency } from '../constants/currencies';

/** Branded ID helper used for nominal typing of entity identifiers. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** ISO 8601 date-time string (e.g. `2026-04-26T02:24:06.311Z`). */
export type IsoDateString = string;

/** ISO 3166-1 alpha-2 country code (e.g. `US`, `CN`). */
export type CountryCode = string;

/**
 * Standard money representation used everywhere on the platform.
 * Amounts are stored as integer minor units to avoid float drift.
 */
export interface Money {
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amountMinor: number;
  /** ISO-4217 currency code. */
  currency: Currency;
}

/** Postal address used for billing and shipping. */
export interface Address {
  fullName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: CountryCode;
  phone?: string;
}

/** Common pagination query parameters. */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Common pagination response wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Generic API result envelope (success). */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Generic API result envelope (error). */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

/** Auditable timestamps shared by most persisted entities. */
export interface Timestamps {
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/** Soft-delete marker. Optional — only entities that support soft delete include it. */
export interface SoftDeletable {
  deletedAt?: IsoDateString | null;
}
