/** Branded ID helper type for distinguishing IDs by entity at the type level. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Standard money representation: integer cents with ISO-4217 currency code. */
export interface Money {
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amountMinor: number;
  /** ISO-4217 currency code, e.g. 'USD'. */
  currency: string;
}

/** Common pagination parameters used across list endpoints. */
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
