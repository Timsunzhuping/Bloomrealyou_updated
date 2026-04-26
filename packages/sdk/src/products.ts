import type {
  Product,
  ProductPriceTier,
  ProductPrintArea,
  ProductVariant,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface ListProductsParams {
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ListProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

/** Strongly-typed client for /products/* endpoints. */
export class ProductsClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: ListProductsParams = {}): Promise<ListProductsResponse> {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<ListProductsResponse>(`/products${qs ? `?${qs}` : ''}`);
  }

  async getBySlug(slug: string): Promise<Product> {
    return this.api.request<Product>(`/products/${encodeURIComponent(slug)}`);
  }

  async listVariants(productId: string): Promise<ProductVariant[]> {
    return this.api.request<ProductVariant[]>(
      `/products/by-id/${encodeURIComponent(productId)}/variants`,
    );
  }

  async listPrintAreas(productId: string): Promise<ProductPrintArea[]> {
    return this.api.request<ProductPrintArea[]>(
      `/products/by-id/${encodeURIComponent(productId)}/print-areas`,
    );
  }

  async listPriceTiers(productId: string): Promise<ProductPriceTier[]> {
    return this.api.request<ProductPriceTier[]>(
      `/products/by-id/${encodeURIComponent(productId)}/price-tiers`,
    );
  }
}
