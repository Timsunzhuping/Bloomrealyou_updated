import { CartClient } from './cart.js';
import { CustomizationsClient } from './customizations.js';
import { PricingClient } from './pricing.js';
import { ProductsClient } from './products.js';

import type { HealthResponse } from './types.js';

/**
 * Tiny pluggable storage contract for the anonymous cart session id.
 * The browser passes a localStorage-backed implementation; the server side
 * uses an in-memory shim so calls remain stateless.
 */
export interface SessionStorage {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

class MemorySessionStorage implements SessionStorage {
  private value: string | null = null;
  get(): string | null {
    return this.value;
  }
  set(value: string): void {
    this.value = value;
  }
  clear(): void {
    this.value = null;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional fetch implementation (defaults to global fetch). */
  fetchFn?: typeof fetch;
  /** Default headers attached to every request. */
  headers?: Record<string, string>;
  /** Optional Next.js `fetch` cache controls forwarded on every request. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Storage adapter for the anonymous cart session id. */
  sessionStorage?: SessionStorage;
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

/** Cart session id header name — must match the Nest controller. */
const CART_SESSION_HEADER = 'x-cart-session';

/**
 * Minimal typed API client. Endpoints are exposed both as raw `request<T>()`
 * for ad-hoc calls and as resource-scoped sub-clients (`products` /
 * `customizations` / `pricing` / `cart`).
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly nextOptions?: ApiClientOptions['next'];
  private readonly session: SessionStorage;

  readonly products: ProductsClient;
  readonly customizations: CustomizationsClient;
  readonly pricing: PricingClient;
  readonly cart: CartClient;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = { 'content-type': 'application/json', ...options.headers };
    this.nextOptions = options.next;
    this.session = options.sessionStorage ?? new MemorySessionStorage();
    this.products = new ProductsClient(this);
    this.customizations = new CustomizationsClient(this);
    this.pricing = new PricingClient(this);
    this.cart = new CartClient(this);
  }

  /** Low-level helper with shared error handling. */
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return (await this.requestWithResponse<T>(path, init)).body;
  }

  /** Low-level helper that exposes response headers (used by cart routes). */
  async requestWithResponse<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ body: T; response: Response }> {
    const url = `${this.baseUrl}${path}`;
    const next = this.nextOptions;
    const sessionId = this.session.get();
    const headers: Record<string, string> = { ...this.defaultHeaders };
    if (sessionId) headers[CART_SESSION_HEADER] = sessionId;
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
        headers[k] = v;
      }
    }
    // Next.js extends `fetch` with a `next` option for caching; cast through.
    const res = await this.fetchFn(url, {
      ...init,
      headers,
      ...(next ? ({ next } as unknown as RequestInit) : {}),
    });
    if (!res.ok) {
      throw new ApiError(`API ${res.status} ${res.statusText} (${path})`, res.status, path);
    }
    const returnedSession = res.headers.get(CART_SESSION_HEADER);
    if (returnedSession && returnedSession !== sessionId) {
      this.session.set(returnedSession);
    }
    const body = (await res.json()) as T;
    return { body, response: res };
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /** Currently-known cart session id, if any. */
  getCartSessionId(): string | null {
    return this.session.get();
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
