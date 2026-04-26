/**
 * Server-side data layer.
 *
 * The web app talks to the API via `@custom-merch/sdk`. When the API is
 * unreachable (e.g. during local development without `pnpm dev:api` running)
 * we fall back to the in-memory mock catalog so pages stay buildable and
 * navigable. The fallback is logged once per failed call but never thrown.
 */
import {
  findMockProductBySlug,
  listMockProducts,
  type Product,
  type ProductPriceTier,
  type ProductPrintArea,
  type ProductVariant,
} from '@custom-merch/shared';
import { ApiError, createApiClient } from '@custom-merch/sdk';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const api = createApiClient({
  baseUrl: API_BASE_URL,
  // Cache product reads for 60s on the server. Detail pages re-fetch on demand.
  next: { revalidate: 60 },
});

let lastWarnedAt = 0;
function warnFallback(label: string, err: unknown): void {
  const now = Date.now();
  if (now - lastWarnedAt > 5_000) {
    lastWarnedAt = now;
    // eslint-disable-next-line no-console
    console.warn(`[web] ${label} fell back to mock data:`, (err as Error).message);
  }
}

export interface ProductListPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

/** List products, optionally scoped by category slug. */
export async function fetchProducts(params: {
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<ProductListPage> {
  try {
    return await api.products.list(params);
  } catch (err) {
    warnFallback('fetchProducts', err);
    const items = listMockProducts({ category: params.category });
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 24;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
  }
}

/** Fetch one product by its slug. Returns null on 404. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await api.products.getBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    warnFallback('fetchProductBySlug', err);
    return findMockProductBySlug(slug)?.product ?? null;
  }
}

export interface ProductDetailBundle {
  product: Product;
  variants: ProductVariant[];
  printAreas: ProductPrintArea[];
  priceTiers: ProductPriceTier[];
}

/** Aggregate fetch used by the detail page. Mock fallback ensures pages render. */
export async function fetchProductBundle(slug: string): Promise<ProductDetailBundle | null> {
  const product = await fetchProductBySlug(slug);
  if (!product) return null;

  let variants: ProductVariant[] = [];
  let printAreas: ProductPrintArea[] = [];
  let priceTiers: ProductPriceTier[] = [];

  try {
    [variants, printAreas, priceTiers] = await Promise.all([
      api.products.listVariants(product.id),
      api.products.listPrintAreas(product.id),
      api.products.listPriceTiers(product.id),
    ]);
  } catch (err) {
    warnFallback('fetchProductBundle', err);
    const bundle = findMockProductBySlug(slug);
    if (bundle) {
      variants = bundle.variants;
      printAreas = bundle.printAreas;
      priceTiers = bundle.priceTiers;
    }
  }

  return { product, variants, printAreas, priceTiers };
}
