import { Injectable, Logger } from '@nestjs/common';

import type { Address } from '@custom-merch/shared';

import { AdminProductsRepository } from '../../admin-products/admin-products.repository';
import { OrdersRepository } from '../../orders/orders.repository';
import { OrdersService } from '../../orders/orders.service';
import { AccountRepository } from '../../account/account.repository';
import { AIService } from '../../ai/ai.service';
import { ToolExecutor } from './tool-executor.service';
import {
  CREATE_ORDER_TOOL,
  ESTIMATE_PRICE_TOOL,
  GENERATE_DESIGN_TOOL,
  GET_ORDER_STATUS_TOOL,
  LIST_MY_ORDERS_TOOL,
  LOOKUP_CUSTOMER_TOOL,
  LOOKUP_ORDER_TOOL,
  SEARCH_PRODUCTS_TOOL,
} from './tools';

/**
 * Wires the agent's tool definitions to the real platform repositories and
 * services. Kept separate from the module so the wiring is unit-testable and
 * the production integrations live in one place.
 *
 * Tools receive a {@link import('../types').ToolContext} so they can act on
 * behalf of the conversation's user (their cart session, their orders, ...).
 */
@Injectable()
export class AgentToolsRegistrar {
  private readonly log = new Logger(AgentToolsRegistrar.name);

  constructor(
    private readonly toolExecutor: ToolExecutor,
    private readonly adminProducts: AdminProductsRepository,
    private readonly orders: OrdersRepository,
    private readonly ordersService: OrdersService,
    private readonly accounts: AccountRepository,
    private readonly ai: AIService,
  ) {}

  registerAll(): void {
    this.registerSearchProducts();
    this.registerEstimatePrice();
    this.registerGenerateDesign();
    this.registerCreateOrder();
    this.registerLookupOrder();
    this.registerGetOrderStatus();
    this.registerLookupCustomer();
    this.registerListMyOrders();
    this.log.log('AI agent production tools registered');
  }

  private registerSearchProducts(): void {
    this.toolExecutor.registerTool(SEARCH_PRODUCTS_TOOL, async (input) => {
      const { query, category, minPrice, maxPrice, limit } = input as {
        query?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        limit?: number;
      };
      const result = this.adminProducts.list({ q: query, category: category as never });
      return result.items
        .filter((p) => {
          const major = p.basePrice.amountMinor / 100;
          if (typeof minPrice === 'number' && major < minPrice) return false;
          if (typeof maxPrice === 'number' && major > maxPrice) return false;
          return true;
        })
        .slice(0, limit ?? 10)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          category: p.category,
          basePriceMinor: p.basePrice.amountMinor,
          currency: p.basePrice.currency,
        }));
    });
  }

  private registerEstimatePrice(): void {
    this.toolExecutor.registerTool(ESTIMATE_PRICE_TOOL, async (input) => {
      const { productId, quantity, customizations } = input as {
        productId: string;
        quantity: number;
        customizations?: Record<string, unknown>;
      };
      const product = this.adminProducts.get(productId);
      if (!product) throw new Error(`Product ${productId} not found`);

      const basePriceMinor = product.basePrice.amountMinor;
      // Quantity price-tier discount (cheapest applicable tier wins).
      const tier = product.priceTiers
        .filter((t) => quantity >= t.minQuantity && (t.maxQuantity == null || quantity <= t.maxQuantity))
        .sort((a, b) => a.unitPrice.amountMinor - b.unitPrice.amountMinor)[0];
      const unitBaseMinor = tier ? tier.unitPrice.amountMinor : basePriceMinor;
      const customizationFeeMinor = customizations ? 500 : 0;
      const unitPriceMinor = unitBaseMinor + customizationFeeMinor;
      const subtotalMinor = unitPriceMinor * quantity;
      const taxMinor = Math.round(subtotalMinor * 0.08);
      const shippingMinor = subtotalMinor > 10000 ? 0 : 1000;
      return {
        productId,
        quantity,
        unitPriceMinor,
        subtotalMinor,
        taxMinor,
        shippingMinor,
        totalMinor: subtotalMinor + taxMinor + shippingMinor,
        currency: product.basePrice.currency,
        appliedTier: tier ? { minQuantity: tier.minQuantity, maxQuantity: tier.maxQuantity } : null,
      };
    });
  }

  private registerGenerateDesign(): void {
    this.toolExecutor.registerTool(GENERATE_DESIGN_TOOL, async (input, context) => {
      const { prompt, style, colors } = input as {
        prompt: string;
        style?: string;
        colors?: string[];
      };
      const styleSuffix = style ? `, ${style} style` : '';
      const colorSuffix = colors && colors.length > 0 ? `, colors: ${colors.join(', ')}` : '';
      const result = await this.ai.generateDesignImage(
        { prompt: `${prompt}${styleSuffix}${colorSuffix}` },
        context.userId,
      );
      return {
        imageUrl: result.imageUrl,
        width: result.width,
        height: result.height,
        prompt: result.prompt,
        provider: result.provider,
      };
    });
  }

  private registerCreateOrder(): void {
    this.toolExecutor.registerTool(CREATE_ORDER_TOOL, async (input, context) => {
      if (!context.sessionId) {
        throw new Error(
          'No active cart session for this conversation. Items must be added to the cart before an order can be placed.',
        );
      }
      const { shippingAddress, billingAddress, customerEmail } = input as {
        shippingAddress?: Partial<Address>;
        billingAddress?: Partial<Address>;
        customerEmail?: string;
      };

      // Fall back to the saved profile / default address when the LLM didn't
      // collect them explicitly.
      const profile = this.accounts.ensureProfile(context.sessionId);
      const email = customerEmail ?? profile.email ?? undefined;
      if (!email) {
        throw new Error('A customer email is required to place the order.');
      }

      const savedAddresses = this.accounts.listAddresses(context.sessionId);
      const defaultShip = savedAddresses.find((a) => a.isDefaultShipping) ?? savedAddresses[0];
      const ship = normaliseAddress(shippingAddress, defaultShip);
      if (!ship) {
        throw new Error('A shipping address is required to place the order.');
      }

      const order = this.ordersService.createFromCart({
        cartSessionId: context.sessionId,
        customerEmail: email,
        shippingAddress: ship,
        billingAddress: normaliseAddress(billingAddress, undefined) ?? undefined,
      });
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalMinor: order.total.amountMinor,
        currency: order.total.currency,
        itemCount: order.items.length,
      };
    });
  }

  private registerLookupOrder(): void {
    this.toolExecutor.registerTool(LOOKUP_ORDER_TOOL, async (input, context) => {
      const { orderId } = input as { orderId: string };
      const order = this.orders.get(orderId) ?? this.orders.getByNumber(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      // Don't leak orders belonging to another session.
      if (context.sessionId && order.cartSessionId && order.cartSessionId !== context.sessionId) {
        throw new Error(`Order ${orderId} not found`);
      }
      return order;
    });
  }

  private registerGetOrderStatus(): void {
    this.toolExecutor.registerTool(GET_ORDER_STATUS_TOOL, async (input, context) => {
      const { orderId } = input as { orderId: string };
      const order = this.orders.get(orderId) ?? this.orders.getByNumber(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (context.sessionId && order.cartSessionId && order.cartSessionId !== context.sessionId) {
        throw new Error(`Order ${orderId} not found`);
      }
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt,
        estimatedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });
  }

  private registerLookupCustomer(): void {
    this.toolExecutor.registerTool(LOOKUP_CUSTOMER_TOOL, async (_input, context) => {
      if (!context.sessionId) {
        return { profile: null, addresses: [] };
      }
      const profile = this.accounts.ensureProfile(context.sessionId);
      const addresses = this.accounts.listAddresses(context.sessionId);
      return {
        profile: {
          email: profile.email,
          fullName: profile.fullName,
          locale: profile.locale,
        },
        addresses: addresses.map((a) => ({
          id: a.id,
          label: a.label,
          city: a.city,
          country: a.country,
          isDefaultShipping: a.isDefaultShipping,
        })),
      };
    });
  }

  private registerListMyOrders(): void {
    this.toolExecutor.registerTool(LIST_MY_ORDERS_TOOL, async (input, context) => {
      const { limit } = input as { limit?: number };
      if (!context.sessionId) return [];
      return this.orders
        .listForSession(context.sessionId)
        .slice(0, limit ?? 5)
        .map((o) => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          placedAt: o.placedAt,
          totalMinor: o.total.amountMinor,
          currency: o.total.currency,
        }));
    });
  }
}

/**
 * Build a full {@link Address} from the LLM-provided partial, falling back to a
 * saved address when fields are missing. Returns null when no usable address
 * can be assembled.
 */
function normaliseAddress(
  partial: Partial<Address> | undefined,
  fallback:
    | {
        fullName: string;
        line1: string;
        line2?: string | null;
        city: string;
        state?: string | null;
        postalCode: string;
        country: string;
        phone?: string | null;
        company?: string | null;
      }
    | undefined,
): Address | null {
  const line1 = partial?.line1 ?? fallback?.line1;
  const city = partial?.city ?? fallback?.city;
  const postalCode = partial?.postalCode ?? fallback?.postalCode;
  const country = partial?.country ?? fallback?.country;
  const fullName = partial?.fullName ?? fallback?.fullName;
  if (!line1 || !city || !postalCode || !country || !fullName) return null;
  return {
    fullName,
    company: partial?.company ?? fallback?.company ?? null,
    line1,
    line2: partial?.line2 ?? fallback?.line2 ?? null,
    city,
    state: partial?.state ?? fallback?.state ?? null,
    postalCode,
    country,
    phone: partial?.phone ?? fallback?.phone ?? null,
  } as Address;
}
