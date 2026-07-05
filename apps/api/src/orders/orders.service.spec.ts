import { Test, TestingModule } from '@nestjs/testing';

import { findMockProductById, type CartItemDto } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';
import { CartRepository } from '../cart/cart.repository';
import { CustomizationsRepository } from '../customizations/customizations.repository';
import { OrderProgressService } from '../notifications/order-progress.service';
import { PricingService } from '../pricing/pricing.service';

import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let carts: CartRepository;
  let pricing: PricingService;

  beforeEach(async () => {
    const snapshots = {
      loadAll: jest.fn().mockResolvedValue([]),
      put: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        OrdersRepository,
        CartRepository,
        CustomizationsRepository,
        PricingService,
        { provide: SnapshotStore, useValue: snapshots },
        { provide: OrderProgressService, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    carts = module.get<CartRepository>(CartRepository);
    pricing = module.get<PricingService>(PricingService);
  });

  it('recalculates final order totals from the selected shipping method', () => {
    const bundle = findMockProductById('prod_classic-cotton-tee');
    if (!bundle) throw new Error('test product missing');
    const variant = bundle.variants[0];
    if (!variant) throw new Error('test variant missing');

    const standardPricing = pricing.calculate({
      productId: bundle.product.id,
      variantId: variant.id,
      quantity: 2,
      printMethod: 'dtg',
      printAreas: ['front'],
      shippingCountry: 'US',
      shippingMethod: 'standard',
    });
    const rushPricing = pricing.calculate({
      productId: bundle.product.id,
      variantId: variant.id,
      quantity: 2,
      printMethod: 'dtg',
      printAreas: ['front'],
      shippingCountry: 'US',
      shippingMethod: 'rush',
      rush: true,
    });
    const staleCartItem: CartItemDto = {
      id: 'cart_item_1',
      productId: bundle.product.id,
      variantId: variant.id,
      customizationId: null,
      quantity: 2,
      unitPrice: standardPricing.unitPrice,
      totalPrice: standardPricing.total,
      previewImageUrl: null,
      printMethod: 'dtg',
      printAreas: ['front'],
      pricingSnapshot: standardPricing,
      productNameSnapshot: bundle.product.name.en ?? bundle.product.slug,
      variantSkuSnapshot: variant.sku,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };
    carts.saveItem('sess_checkout', staleCartItem);

    const order = service.createFromCart({
      cartSessionId: 'sess_checkout',
      customerEmail: 'buyer@example.com',
      shippingAddress: {
        fullName: 'Buyer Example',
        line1: '1 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
      },
      shippingMethod: 'rush',
      locale: 'en',
    });

    expect(order.shippingMethod).toBe('rush');
    expect(order.items[0]?.totalPrice).toEqual(rushPricing.total);
    expect(order.total).toEqual(rushPricing.total);
    expect(order.shipping).toEqual(rushPricing.shippingFee);
    expect(order.total.amountMinor).toBeGreaterThan(standardPricing.total.amountMinor);
    expect(carts.toDto('sess_checkout').items).toEqual([]);
  });
});
