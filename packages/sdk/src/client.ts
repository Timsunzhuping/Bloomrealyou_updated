import { AccountClient } from './account.js';
import { AdminAuthClient } from './admin-auth.js';
import { AdminDashboardClient } from './admin-dashboard.js';
import { AdminDesignReviewsClient } from './admin-design-reviews.js';
import { AdminNotificationsClient } from './admin-notifications.js';
import { AdminOrdersClient } from './admin-orders.js';
import { AdminProductionClient } from './admin-production.js';
import { AdminProductsClient } from './admin-products.js';
import { AdminShipmentsClient, OrderTrackingClient } from './admin-shipments.js';
import { AdminSuppliersClient } from './admin-suppliers.js';
import { AdminTemplatesClient } from './admin-templates.js';
import { SupplierPortalClient } from './supplier-portal.js';
import { AIClient } from './ai.js';
import { CartClient } from './cart.js';
import { CustomizationsClient } from './customizations.js';
import { OrdersClient } from './orders.js';
import { PaymentsClient } from './payments.js';
import { PricingClient } from './pricing.js';
import { ProductsClient } from './products.js';
import { AdminQuotesClient } from './quotes.js';
import { AdminRFQsClient, RFQsClient } from './rfqs.js';

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
  /** Optional pre-existing admin bearer token (e.g. read from a cookie). */
  adminToken?: string | null;
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
  private adminToken: string | null;

  readonly products: ProductsClient;
  readonly customizations: CustomizationsClient;
  readonly pricing: PricingClient;
  readonly cart: CartClient;
  readonly orders: OrdersClient;
  readonly payments: PaymentsClient;
  readonly account: AccountClient;
  readonly ai: AIClient;
  readonly rfqs: RFQsClient;
  readonly adminRfqs: AdminRFQsClient;
  readonly adminQuotes: AdminQuotesClient;
  readonly adminAuth: AdminAuthClient;
  readonly adminDashboard: AdminDashboardClient;
  readonly adminProducts: AdminProductsClient;
  readonly adminTemplates: AdminTemplatesClient;
  readonly adminOrders: AdminOrdersClient;
  readonly adminDesignReviews: AdminDesignReviewsClient;
  readonly adminNotifications: AdminNotificationsClient;
  readonly adminSuppliers: AdminSuppliersClient;
  readonly adminProduction: AdminProductionClient;
  readonly adminShipments: AdminShipmentsClient;
  readonly tracking: OrderTrackingClient;
  readonly supplierPortal: SupplierPortalClient;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = { 'content-type': 'application/json', ...options.headers };
    this.nextOptions = options.next;
    this.session = options.sessionStorage ?? new MemorySessionStorage();
    this.adminToken = options.adminToken ?? null;
    this.products = new ProductsClient(this);
    this.customizations = new CustomizationsClient(this);
    this.pricing = new PricingClient(this);
    this.cart = new CartClient(this);
    this.orders = new OrdersClient(this);
    this.payments = new PaymentsClient(this);
    this.account = new AccountClient(this);
    this.ai = new AIClient(this);
    this.rfqs = new RFQsClient(this);
    this.adminRfqs = new AdminRFQsClient(this);
    this.adminQuotes = new AdminQuotesClient(this);
    this.adminAuth = new AdminAuthClient(this);
    this.adminDashboard = new AdminDashboardClient(this);
    this.adminProducts = new AdminProductsClient(this);
    this.adminTemplates = new AdminTemplatesClient(this);
    this.adminOrders = new AdminOrdersClient(this);
    this.adminDesignReviews = new AdminDesignReviewsClient(this);
    this.adminNotifications = new AdminNotificationsClient(this);
    this.adminSuppliers = new AdminSuppliersClient(this);
    this.adminProduction = new AdminProductionClient(this);
    this.adminShipments = new AdminShipmentsClient(this);
    this.tracking = new OrderTrackingClient(this);
    this.supplierPortal = new SupplierPortalClient(this);
  }

  /** Set / clear the admin bearer token. Cleared on logout. */
  setAdminToken(token: string | null): void {
    this.adminToken = token;
  }

  getAdminToken(): string | null {
    return this.adminToken;
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
    if (this.adminToken) headers['authorization'] = `Bearer ${this.adminToken}`;
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
