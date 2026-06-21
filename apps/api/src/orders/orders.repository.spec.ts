import { Test, TestingModule } from '@nestjs/testing';

import type { OrderDto } from '@custom-merch/shared';

import { OrdersRepository } from './orders.repository';
import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

describe('OrdersRepository - persistence', () => {
  let repository: OrdersRepository;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  const mockOrder = {
    id: 'order_test_123',
    orderNumber: 'ORD-001',
    customerUserId: null,
    customerEmail: 'test@example.com',
    status: 'pending_payment',
    cartSessionId: 'session_abc',
    placedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as OrderDto;

  beforeEach(async () => {
    snapshots = {
      loadAll: jest.fn().mockResolvedValue([]),
      put: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
  });

  describe('save', () => {
    it('should save order to the in-memory store', () => {
      const result = repository.save(mockOrder);

      expect(result).toEqual(mockOrder);
      expect(repository.get(mockOrder.id)).toEqual(mockOrder);
    });

    it('should index by order number', () => {
      repository.save(mockOrder);
      expect(repository.getByNumber(mockOrder.orderNumber)).toEqual(mockOrder);
    });

    it('should write-through to the durable snapshot store', () => {
      repository.save(mockOrder);

      expect(snapshots.put).toHaveBeenCalledWith(
        'order',
        mockOrder.id,
        mockOrder,
        mockOrder.orderNumber,
      );
    });

    it('should handle multiple orders', () => {
      const order1 = { ...mockOrder, id: 'o1', orderNumber: 'ORD-001' };
      const order2 = { ...mockOrder, id: 'o2', orderNumber: 'ORD-002' };

      repository.save(order1);
      repository.save(order2);

      expect(repository.get('o1')).toEqual(order1);
      expect(repository.get('o2')).toEqual(order2);
      expect(repository.listAll().length).toBe(2);
    });
  });

  describe('getByNumber', () => {
    it('should return order by order number', () => {
      repository.save(mockOrder);
      expect(repository.getByNumber(mockOrder.orderNumber)).toEqual(mockOrder);
    });

    it('should return undefined for non-existent order number', () => {
      expect(repository.getByNumber('FAKE-999')).toBeUndefined();
    });
  });

  describe('setStatus', () => {
    it('should update order status and write-through', () => {
      repository.save(mockOrder);
      snapshots.put.mockClear();

      const result = repository.setStatus(mockOrder.id, 'paid');

      expect(result?.status).toBe('paid');
      expect(repository.get(mockOrder.id)?.status).toBe('paid');
      expect(snapshots.put).toHaveBeenCalledWith(
        'order',
        mockOrder.id,
        expect.objectContaining({ status: 'paid' }),
        mockOrder.orderNumber,
      );
    });

    it('should return undefined for non-existent order', () => {
      expect(repository.setStatus('fake_id', 'paid')).toBeUndefined();
    });
  });

  describe('listForSession', () => {
    it('should return orders for a given session, newest first', () => {
      const now = Date.now();
      const order1 = {
        ...mockOrder,
        id: 'o1',
        cartSessionId: 'session_abc',
        placedAt: new Date(now - 2000).toISOString(),
      };
      const order2 = {
        ...mockOrder,
        id: 'o2',
        cartSessionId: 'session_xyz',
        placedAt: new Date(now - 1000).toISOString(),
      };
      const order3 = {
        ...mockOrder,
        id: 'o3',
        cartSessionId: 'session_abc',
        placedAt: new Date(now).toISOString(),
      };

      repository.save(order1);
      repository.save(order2);
      repository.save(order3);

      const result = repository.listForSession('session_abc');

      expect(result.map((o) => o.id)).toEqual(['o3', 'o1']);
    });

    it('should return empty array for unknown session', () => {
      expect(repository.listForSession('fake_session')).toEqual([]);
    });
  });

  describe('onModuleInit (priming from durable store)', () => {
    it('should load orders snapshots into memory on init', async () => {
      const rows: SnapshotRow<OrderDto>[] = [
        {
          entityId: 'db_order_1',
          refKey: 'ORD-DB-001',
          data: { ...mockOrder, id: 'db_order_1', orderNumber: 'ORD-DB-001' },
        },
      ];
      snapshots.loadAll.mockResolvedValueOnce(rows);

      await repository.onModuleInit();

      expect(snapshots.loadAll).toHaveBeenCalledWith('order');
      expect(repository.get('db_order_1')).toBeDefined();
      expect(repository.getByNumber('ORD-DB-001')?.id).toBe('db_order_1');
    });

    it('should handle an empty durable store', async () => {
      snapshots.loadAll.mockResolvedValueOnce([]);
      await repository.onModuleInit();
      expect(repository.listAll()).toEqual([]);
    });
  });
});
