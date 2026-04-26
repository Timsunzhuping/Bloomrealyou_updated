import { CustomizationsClient } from './customizations.js';
import { ProductsClient } from './products.js';

import type { HealthResponse } from './types.js';

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional fetch implementation (defaults to global fetch). */
  fetchFn?: typeof fetch;
  /** Default headers attached to every request. */
  headers?: Record<string, string>;
  /** Optional Next.js `fetch` cache controls forwarded on every request. */
  next?: { revalidate?: number | false; tags?: string[] };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Minimal typed API client. Endpoints are exposed both as raw `request<T>()`
 * for ad-hoc calls and as resource-scoped sub-clients (`products`).
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly nextOptions?: ApiClientOptions['next'];

  readonly products: ProductsClient;
  readonly customizations: CustomizationsClient;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = { 'content-type': 'application/json', ...options.headers };
    this.nextOptions = options.next;
    this.products = new ProductsClient(this);
    this.customizations = new CustomizationsClient(this);
  }

  /** Low-level GET helper with shared error handling. */
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const next = this.nextOptions;
    // Next.js extends `fetch` with a `next` option for caching; cast through.
    const res = await this.fetchFn(url, {
      ...init,
      headers: { ...this.defaultHeaders, ...(init.headers ?? {}) },
      ...(next ? ({ next } as unknown as RequestInit) : {}),
    });
    if (!res.ok) {
      throw new ApiError(`API ${res.status} ${res.statusText} (${path})`, res.status, path);
    }
    return (await res.json()) as T;
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
