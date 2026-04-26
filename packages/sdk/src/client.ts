import type { HealthResponse } from './types.js';

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional fetch implementation (defaults to global fetch). */
  fetchFn?: typeof fetch;
  /** Default headers attached to every request. */
  headers?: Record<string, string>;
}

/**
 * Minimal typed API client. Endpoints are added incrementally per work package.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = { 'content-type': 'application/json', ...options.headers };
  }

  async health(): Promise<HealthResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/health`, { headers: this.defaultHeaders });
    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as HealthResponse;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
