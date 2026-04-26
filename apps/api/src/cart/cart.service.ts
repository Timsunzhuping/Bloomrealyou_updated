import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  findMockProductById,
  type CartDto,
  type CartItemDto,
  type PrintMethod,
} from '@custom-merch/shared';

import { PricingService } from '../pricing/pricing.service';

import { CartRepository } from './cart.repository';

interface AddItemInput {
  productId: string;
  variantId: string;
  customizationId?: string | null;
  quantity: number;
  printMethod?: PrintMethod;
  printAreas?: string[];
  rush?: boolean;
  shippingCountry?: string;
  previewImageUrl?: string | null;
  productNameSnapshot?: string;
  variantSkuSnapshot?: string;
}

interface UpdateItemInput {
  quantity?: number;
  printMethod?: PrintMethod;
  printAreas?: string[];
  rush?: boolean;
  shippingCountry?: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    private readonly pricing: PricingService,
  ) {}

  get(sessionId: string): CartDto {
    return this.repo.toDto(sessionId);
  }

  addItem(sessionId: string, input: AddItemInput): CartDto {
    const bundle = findMockProductById(input.productId);
    if (!bundle) throw new NotFoundException(`Product not found: ${input.productId}`);
    const variant = bundle.variants.find((v) => v.id === input.variantId);
    if (!variant) throw new NotFoundException(`Variant not found: ${input.variantId}`);

    const pricing = this.pricing.calculate({
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      printMethod: input.printMethod,
      printAreas: input.printAreas,
      shippingCountry: input.shippingCountry,
      rush: input.rush,
    });

    const now = new Date().toISOString();
    const item: CartItemDto = {
      id: randomUUID(),
      productId: input.productId,
      variantId: input.variantId,
      customizationId: input.customizationId ?? null,
      quantity: input.quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.total,
      previewImageUrl: input.previewImageUrl ?? null,
      printMethod: input.printMethod ?? null,
      printAreas: input.printAreas ?? [],
      pricingSnapshot: pricing,
      productNameSnapshot:
        input.productNameSnapshot ?? bundle.product.name.en ?? bundle.product.slug,
      variantSkuSnapshot: input.variantSkuSnapshot ?? variant.sku,
      createdAt: now,
      updatedAt: now,
    };
    this.repo.saveItem(sessionId, item);
    return this.repo.toDto(sessionId);
  }

  updateItem(sessionId: string, itemId: string, patch: UpdateItemInput): CartDto {
    const cart = this.repo.toDto(sessionId);
    const existing = cart.items.find((i) => i.id === itemId);
    if (!existing) throw new NotFoundException(`Cart item not found: ${itemId}`);

    const next = {
      ...existing,
      quantity: patch.quantity ?? existing.quantity,
      printMethod: patch.printMethod ?? existing.printMethod ?? undefined,
      printAreas: patch.printAreas ?? existing.printAreas,
    };

    const pricing = this.pricing.calculate({
      productId: existing.productId,
      variantId: existing.variantId,
      quantity: next.quantity,
      printMethod: next.printMethod ?? undefined,
      printAreas: next.printAreas,
      shippingCountry: patch.shippingCountry,
      rush: patch.rush,
    });

    const updated: CartItemDto = {
      ...existing,
      quantity: next.quantity,
      printMethod: next.printMethod ?? existing.printMethod ?? null,
      printAreas: next.printAreas,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.total,
      pricingSnapshot: pricing,
      updatedAt: new Date().toISOString(),
    };
    this.repo.saveItem(sessionId, updated);
    return this.repo.toDto(sessionId);
  }

  removeItem(sessionId: string, itemId: string): CartDto {
    this.repo.removeItem(sessionId, itemId);
    return this.repo.toDto(sessionId);
  }

  recalculate(sessionId: string, opts: { shippingCountry?: string; rush?: boolean }): CartDto {
    const cart = this.repo.toDto(sessionId);
    const next = cart.items.map((item) => {
      const pricing = this.pricing.calculate({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        printMethod: item.printMethod ?? undefined,
        printAreas: item.printAreas,
        shippingCountry: opts.shippingCountry,
        rush: opts.rush,
      });
      return {
        ...item,
        unitPrice: pricing.unitPrice,
        totalPrice: pricing.total,
        pricingSnapshot: pricing,
        updatedAt: new Date().toISOString(),
      };
    });
    this.repo.replaceItems(sessionId, next);
    return this.repo.toDto(sessionId);
  }
}
