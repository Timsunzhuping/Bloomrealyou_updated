import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  findMockProductById,
  generateOrderNumber,
  type Address,
  type ConvertQuoteToOrderInput,
  type CreateOrderInput,
  type OrderDto,
  type OrderItemDto,
  type OrderStatus,
  type QuoteDto,
} from '@custom-merch/shared';

import { CartRepository } from '../cart/cart.repository';
import { PricingService } from '../pricing/pricing.service';
import { CustomizationsRepository } from '../customizations/customizations.repository';
import { OrderProgressService } from '../notifications/order-progress.service';

import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private readonly orders: OrdersRepository,
    private readonly carts: CartRepository,
    private readonly pricing: PricingService,
    private readonly customizations: CustomizationsRepository,
    private readonly progress: OrderProgressService,
  ) {}

  /** Create an order from a cart session. */
  createFromCart(input: CreateOrderInput): OrderDto {
    const cart = this.carts.toDto(input.cartSessionId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const billing = input.billingAddress ?? input.shippingAddress;
    const shippingMethod = input.shippingMethod ?? 'standard';

    const shippingCountry = input.shippingAddress.country;
    const isRush = shippingMethod === 'rush';
    let subtotalMinor = 0;
    let shippingMinor = 0;
    let taxMinor = 0;
    let totalMinor = 0;

    const items: OrderItemDto[] = cart.items.map((line) => {
      const bundle = findMockProductById(line.productId);
      const variant = bundle?.variants.find((v) => v.id === line.variantId);
      const pricing = this.pricing.calculate({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        printMethod: line.printMethod ?? undefined,
        printAreas: line.printAreas,
        shippingCountry,
        shippingMethod,
        rush: isRush,
      });
      subtotalMinor += pricing.subtotal.amountMinor + pricing.printingFee.amountMinor + pricing.rushFee.amountMinor;
      shippingMinor += pricing.shippingFee.amountMinor;
      totalMinor += pricing.total.amountMinor;
      const design = line.customizationId
        ? this.customizations.get(line.customizationId)
        : undefined;
      const productionFileUrl = design?.productionFileUrl ?? null;
      const designJson = design?.designJson ?? null;
      const previewImageUrl = line.previewImageUrl ?? design?.previewImageUrl ?? null;

      return {
        id: randomUUID(),
        orderId: '', // filled below
        productId: line.productId,
        variantId: line.variantId,
        customizationId: line.customizationId ?? null,
        productNameSnapshot: line.productNameSnapshot,
        variantSkuSnapshot: line.variantSkuSnapshot,
        variantAttributesSnapshot: variant?.attributes ?? {},
        designJsonSnapshot: designJson,
        previewImageUrl,
        productionFileUrl,
        printMethod: line.printMethod ?? null,
        printAreas: line.printAreas,
        quantity: line.quantity,
        unitPrice: pricing.unitPrice,
        totalPrice: pricing.total,
      };
    });

    const orderId = randomUUID();
    items.forEach((i) => (i.orderId = orderId));

    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const order: OrderDto = {
      id: orderId,
      orderNumber,
      customerUserId: null,
      customerEmail: input.customerEmail,
      status: 'pending_payment',
      locale: input.locale ?? 'en',
      currency: cart.currency,
      shippingAddress: input.shippingAddress as Address,
      billingAddress: billing as Address,
      shippingMethod,
      subtotal: money(subtotalMinor, cart.currency),
      shipping: money(shippingMinor, cart.currency),
      tax: money(taxMinor, cart.currency),
      discount: { amountMinor: 0, currency: cart.currency },
      total: money(totalMinor, cart.currency),
      items,
      notes: input.notes ?? null,
      cartSessionId: input.cartSessionId,
      placedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.save(order);
    this.log.log(`order created ${orderNumber} (id=${orderId}, items=${items.length})`);
    // Empty the cart so a refresh doesn't replay the line items.
    this.carts.replaceItems(input.cartSessionId, []);
    this.progress.notify(orderId, 'order_created', {
      extra: { itemCount: items.length, totalFormatted: formatMoney(order.total) },
    });
    return order;
  }

  get(id: string): OrderDto {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }

  getByNumber(orderNumber: string): OrderDto {
    const order = this.orders.getByNumber(orderNumber);
    if (!order) throw new NotFoundException(`Order not found: ${orderNumber}`);
    return order;
  }

  setStatus(id: string, status: OrderStatus): OrderDto | undefined {
    return this.orders.setStatus(id, status);
  }

  /**
   * Build an order directly from a quote, bypassing the cart. Used when sales
   * converts an RFQ → Quote → Order. Catalog snapshot fields are best-effort
   * lookups against the mock catalog; description/quantity/price come from the
   * quote line items.
   */
  createFromQuote(quote: QuoteDto, input: ConvertQuoteToOrderInput): OrderDto {
    const orderId = randomUUID();
    const items: OrderItemDto[] = quote.items.map((line) => {
      const bundle = line.productId ? findMockProductById(line.productId) : undefined;
      const variant = bundle?.variants[0];
      const productName = bundle?.product.name?.[quote.locale] ?? bundle?.product.name?.en;
      return {
        id: randomUUID(),
        orderId,
        productId: line.productId ?? `quote-line:${line.id}`,
        variantId: variant?.id ?? `quote-line:${line.id}`,
        customizationId: null,
        productNameSnapshot: productName ?? line.description,
        variantSkuSnapshot: variant?.sku ?? line.description.slice(0, 64),
        variantAttributesSnapshot: variant?.attributes ?? {},
        designJsonSnapshot: null,
        previewImageUrl: null,
        productionFileUrl: null,
        printMethod: null,
        printAreas: [],
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.lineTotal,
      };
    });

    const billing = (input.billingAddress ?? input.shippingAddress) as Address;
    const shippingMethod = input.shippingMethod ?? 'standard';
    const now = new Date().toISOString();

    const order: OrderDto = {
      id: orderId,
      orderNumber: generateOrderNumber(),
      customerUserId: null,
      customerEmail: quote.customerEmail,
      status: 'pending_payment',
      locale: quote.locale,
      currency: quote.currency,
      shippingAddress: input.shippingAddress as Address,
      billingAddress: billing,
      shippingMethod,
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      items,
      notes: input.notes ?? `Converted from quote ${quote.quoteNumber}`,
      cartSessionId: null,
      placedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.save(order);
    this.log.log(`order created from quote ${quote.quoteNumber} (id=${orderId})`);
    this.progress.notify(orderId, 'order_created', {
      extra: { itemCount: items.length, totalFormatted: formatMoney(order.total) },
    });
    return order;
  }
}

function formatMoney(money: { amountMinor: number; currency: string }): string {
  const major = (money.amountMinor / 100).toFixed(2);
  return `${money.currency} ${major}`;
}

function money(amountMinor: number, currency: OrderDto['currency']): OrderDto['total'] {
  return {
    amountMinor: Math.max(0, Math.round(amountMinor)),
    currency,
  };
}
