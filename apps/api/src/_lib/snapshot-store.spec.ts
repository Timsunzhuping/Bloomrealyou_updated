import {
  __resetPrismaSinkForTests,
  __setPrismaClientForTests,
} from './prisma-sink';
import { SnapshotStore } from './snapshot-store';

describe('SnapshotStore', () => {
  let entitySnapshot: {
    findMany: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  let store: SnapshotStore;

  beforeEach(() => {
    entitySnapshot = {
      findMany: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    __setPrismaClientForTests({ entitySnapshot });
    store = new SnapshotStore();
  });

  afterEach(() => {
    __resetPrismaSinkForTests();
  });

  it('loads and maps snapshots for a kind', async () => {
    entitySnapshot.findMany.mockResolvedValueOnce([
      {
        kind: 'order',
        entityId: 'order_1',
        refKey: 'ORD-001',
        data: { id: 'order_1', orderNumber: 'ORD-001' },
      },
    ]);

    const rows = await store.loadAll<{ id: string; orderNumber: string }>('order');

    expect(entitySnapshot.findMany).toHaveBeenCalledWith({ where: { kind: 'order' } });
    expect(rows).toEqual([
      {
        entityId: 'order_1',
        refKey: 'ORD-001',
        data: { id: 'order_1', orderNumber: 'ORD-001' },
      },
    ]);
  });

  it('upserts snapshots with the composite kind/entity id key', async () => {
    store.put('payment', 'pay_1', { id: 'pay_1', status: 'pending' }, 'pi_123');
    await flushPrismaSink();

    expect(entitySnapshot.upsert).toHaveBeenCalledWith({
      where: { kind_entityId: { kind: 'payment', entityId: 'pay_1' } },
      update: { data: { id: 'pay_1', status: 'pending' }, refKey: 'pi_123' },
      create: {
        kind: 'payment',
        entityId: 'pay_1',
        refKey: 'pi_123',
        data: { id: 'pay_1', status: 'pending' },
      },
    });
  });

  it('deletes snapshots by composite key', async () => {
    store.remove('cart', 'session_1');
    await flushPrismaSink();

    expect(entitySnapshot.delete).toHaveBeenCalledWith({
      where: { kind_entityId: { kind: 'cart', entityId: 'session_1' } },
    });
  });

  it('treats missing snapshots as a no-op during delete', async () => {
    entitySnapshot.delete.mockRejectedValueOnce(new Error('not found'));

    store.remove('cart', 'session_missing');
    await flushPrismaSink();

    expect(entitySnapshot.delete).toHaveBeenCalledTimes(1);
  });

  it('waits for confirmed writes in one transaction and propagates failure', async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://test/test';
    const transaction = jest.fn().mockResolvedValue(undefined);
    __setPrismaClientForTests({ entitySnapshot, $transaction: transaction });
    try {
      await store.putBatchConfirmed([
        { kind: 'admin_product', entityId: 'p1', data: { id: 'p1' } },
        { kind: 'product_listing', entityId: 'l1', data: { productId: 'p1' } },
      ]);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(transaction.mock.calls[0]?.[0]).toHaveLength(2);
      transaction.mockRejectedValueOnce(new Error('database unavailable'));
      await expect(
        store.putBatchConfirmed([{ kind: 'product_listing', entityId: 'l1', data: {} }]),
      ).rejects.toMatchObject({ status: 503 });
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});

async function flushPrismaSink(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
