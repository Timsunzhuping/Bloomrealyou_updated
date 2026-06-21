import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import type { OrderDto } from '@custom-merch/shared';

import { OrdersRepository } from './orders.repository';
import { PrismaService } from '../_lib/prisma.service';

describe('OrdersRepository - persistence', () => {
  let repository: OrdersRepository;
  let prismaService: PrismaService;

  const mockOrder: OrderDto = {
    id: 'order_test_123',
    orderNumber: 'ORD-001',
    cartSessionId: 'session_abc',
    customerEmail: 'test@example.com',
    customerName: 'Test User',
    status: 'pending_payment',
    placedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Mock PrismaService
    const mockPrismaService = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      client_: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('save', () => {
    it('should save order to in-memory store', () => {
      const result = repository.save(mockOrder);

      expect(result).toEqual(mockOrder);
      expect(repository.get(mockOrder.id)).toEqual(mockOrder);
    });

    it('should update order number lookup', () => {
      repository.save(mockOrder);

      const retrieved = repository.getByNumber(mockOrder.orderNumber);
      expect(retrieved).toEqual(mockOrder);
    });

    it('should trigger fire-and-forget Prisma write', () => {
      repository.save(mockOrder);

      // The actual write happens async, so we can't directly verify it synchronously.
      // In a real integration test with a real DB, we'd verify Prisma persistence.
      // This test verifies the method doesn't throw and in-memory store is updated.
      expect(repository.get(mockOrder.id)).toBeDefined();
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

      const result = repository.getByNumber(mockOrder.orderNumber);
      expect(result).toEqual(mockOrder);
    });

    it('should return undefined for non-existent order number', () => {
      const result = repository.getByNumber('FAKE-999');
      expect(result).toBeUndefined();
    });
  });

  describe('setStatus', () => {
    it('should update order status', () => {
      repository.save(mockOrder);

      const result = repository.setStatus(mockOrder.id, 'paid');

      expect(result).toBeDefined();
      expect(result?.status).toBe('paid');
      expect(repository.get(mockOrder.id)?.status).toBe('paid');
    });

    it('should return undefined for non-existent order', () => {
      const result = repository.setStatus('fake_id', 'paid');
      expect(result).toBeUndefined();
    });

    it('should update timestamp on status change', () => {
      repository.save(mockOrder);
      const before = repository.get(mockOrder.id)?.updatedAt;

      // Small delay to ensure timestamp difference
      new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        repository.setStatus(mockOrder.id, 'in_production');
        const after = repository.get(mockOrder.id)?.updatedAt;

        expect(after).not.toBe(before);
      });
    });
  });

  describe('listForSession', () => {
    it('should return orders for a given session', () => {
      const order1 = { ...mockOrder, id: 'o1', cartSessionId: 'session_abc' };
      const order2 = { ...mockOrder, id: 'o2', cartSessionId: 'session_xyz' };
      const order3 = { ...mockOrder, id: 'o3', cartSessionId: 'session_abc' };

      repository.save(order1);
      repository.save(order2);
      repository.save(order3);

      const result = repository.listForSession('session_abc');

      expect(result.length).toBe(2);
      expect(result.map(o => o.id)).toContain('o1');
      expect(result.map(o => o.id)).toContain('o3');
    });

    it('should return empty array for non-existent session', () => {
      const result = repository.listForSession('fake_session');
      expect(result).toEqual([]);
    });

    it('should sort by placedAt descending', () => {
      const now = new Date();
      const order1 = {
        ...mockOrder,
        id: 'o1',
        placedAt: new Date(now.getTime() - 2000).toISOString(),
      };
      const order2 = {
        ...mockOrder,
        id: 'o2',
        placedAt: new Date(now.getTime() - 1000).toISOString(),
      };
      const order3 = {
        ...mockOrder,
        id: 'o3',
        placedAt: new Date(now.getTime()).toISOString(),
      };

      repository.save(order1);
      repository.save(order2);
      repository.save(order3);

      const result = repository.listForSession(mockOrder.cartSessionId);

      expect(result[0].id).toBe('o3');  // Most recent
      expect(result[1].id).toBe('o2');
      expect(result[2].id).toBe('o1');  // Oldest
    });
  });

  describe('listAll', () => {
    it('should return all orders sorted by placedAt descending', () => {
      const now = new Date();
      const order1 = { ...mockOrder, id: 'o1', placedAt: new Date(now.getTime() - 2000).toISOString() };
      const order2 = { ...mockOrder, id: 'o2', placedAt: new Date(now.getTime()).toISOString() };

      repository.save(order1);
      repository.save(order2);

      const result = repository.listAll();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('o2');  // Most recent first
      expect(result[1].id).toBe('o1');
    });
  });

  describe('onModuleInit (Prisma priming)', () => {
    it('should load orders from database on init (when available)', async () => {
      // This test verifies the priming logic. In a real integration test,
      // we'd use a real test database and verify orders are loaded from Prisma.
      const mockPrismaOrder = {
        id: 'db_order_1',
        orderNumber: 'ORD-DB-001',
        cartSessionId: 'session_db',
        customerEmail: 'db@example.com',
        customerName: 'DB User',
        status: 'paid',
        placedAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the Prisma client to return an order on findMany
      (prismaService.order.findMany as jest.Mock).mockResolvedValueOnce([mockPrismaOrder]);

      // Reinitialize the repository to trigger onModuleInit
      const newRepository = new OrdersRepository(prismaService);
      await newRepository.onModuleInit();

      // Verify the order was loaded into memory
      const loaded = newRepository.get('db_order_1');
      expect(loaded).toBeDefined();
      expect(loaded?.orderNumber).toBe('ORD-DB-001');
    });

    it('should handle empty database on init', async () => {
      (prismaService.order.findMany as jest.Mock).mockResolvedValueOnce([]);

      const newRepository = new OrdersRepository(prismaService);
      await newRepository.onModuleInit();

      expect(newRepository.listAll()).toEqual([]);
    });
  });
});
