import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  findMockProductById,
  generateOrderNumber,
  type Address,
  type CreateOrderInput,
  type OrderDto,
  type OrderItemDto,
  type OrderStatus,
} from '@custom-merch/shared';

import { CartRepository } from '../cart/cart.repository';
import { CustomizationsRepository } from '../customizations/customizations.repository';

import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private readonly orders: OrdersRepository,
    private readonly carts: CartRepository,
    private readonly customizations: CustomizationsRepository,
  ) {}

  /** Create an order from a cart session. */
  createFromCart(input: CreateOrderInput): OrderDto {
    const cart = this.carts.toDto(input.cartSessionId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const billing = input.billingAddress ?? input.shippingAddress;
    const shippingMethod = input.shippingMethod ?? 'standard';

    const items: OrderItemDto[] = cart.items.map((line) => {
      const bundle = findMockProductById(line.productId);
      const variant = bundle?.variants.find((v) => v.id === line.variantId);
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
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
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
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      tax: cart.tax,
      discount: { amountMinor: 0, currency: cart.currency },
      total: cart.total,
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
}
