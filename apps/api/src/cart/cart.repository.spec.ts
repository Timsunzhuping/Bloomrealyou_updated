import { Test, TestingModule } from '@nestjs/testing';

import type { CartItemDto } from '@custom-merch/shared';

import { CartRepository } from './cart.repository';
import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

function makeItem(id: string): CartItemDto {
  return {
    id,
    productId: 'p1',
    variantId: 'v1',
    productNameSnapshot: 'Tee',
    variantSkuSnapshot: 'TEE-RED-M',
    quantity: 1,
    unitPrice: { amountMinor: 1000, currency: 'USD' },
    totalPrice: { amountMinor: 1000, currency: 'USD' },
    pricingSnapshot: {
      subtotal: { amountMinor: 1000, currency: 'USD' },
      shippingFee: { amountMinor: 0, currency: 'USD' },
    },
  } as unknown as CartItemDto;
}

describe('CartRepository - persistence', () => {
  let repository: CartRepository;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();
    repository = module.get<CartRepository>(CartRepository);
  });

  it('should write-through on saveItem', () => {
    repository.saveItem('sess_1', makeItem('i1'));

    expect(snapshots.put).toHaveBeenCalledWith(
      'cart',
      'sess_1',
      expect.objectContaining({ sessionId: 'sess_1' }),
      expect.any(String),
    );
    expect(repository.toDto('sess_1').items.length).toBe(1);
  });

  it('should NOT persist an empty cart created by a bare ensure()', () => {
    repository.ensure('sess_browse_only');
    expect(snapshots.put).not.toHaveBeenCalled();
  });

  it('should write-through on removeItem and replaceItems', () => {
    repository.saveItem('sess_2', makeItem('i1'));
    snapshots.put.mockClear();

    repository.removeItem('sess_2', 'i1');
    expect(snapshots.put).toHaveBeenCalledTimes(1);

    repository.replaceItems('sess_2', [makeItem('i2'), makeItem('i3')]);
    expect(snapshots.put).toHaveBeenCalledTimes(2);
    expect(repository.toDto('sess_2').items.length).toBe(2);
  });

  it('should prime carts from the durable store on init', async () => {
    const rows: SnapshotRow<any>[] = [
      {
        entityId: 'sess_db',
        refKey: 'cart_db',
        data: {
          id: 'cart_db',
          sessionId: 'sess_db',
          items: [makeItem('i9')],
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];
    snapshots.loadAll.mockResolvedValueOnce(rows);

    await repository.onModuleInit();

    expect(snapshots.loadAll).toHaveBeenCalledWith('cart');
    expect(repository.toDto('sess_db').items.length).toBe(1);
  });

  it('should skip and delete expired carts during prime', async () => {
    const rows: SnapshotRow<any>[] = [
      {
        entityId: 'sess_old',
        refKey: 'cart_old',
        data: {
          id: 'cart_old',
          sessionId: 'sess_old',
          items: [makeItem('old_item')],
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ];
    snapshots.loadAll.mockResolvedValueOnce(rows);

    await repository.onModuleInit();

    expect(snapshots.remove).toHaveBeenCalledWith('cart', 'sess_old');
    expect(repository.toDto('sess_old').items).toEqual([]);
  });

  it('should lazily replace an expired in-memory cart', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T00:00:00.000Z'));
    try {
      repository.saveItem('sess_live_expired', makeItem('active_item'));
      const originalId = repository.toDto('sess_live_expired').id;

      jest.setSystemTime(new Date('2026-07-12T00:00:00.000Z'));

      const dto = repository.toDto('sess_live_expired');
      expect(snapshots.remove).toHaveBeenCalledWith('cart', 'sess_live_expired');
      expect(dto.id).not.toBe(originalId);
      expect(dto.items).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });
});
