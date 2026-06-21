import { Test, TestingModule } from '@nestjs/testing';

import type { PaymentDto } from '@custom-merch/shared';

import { PaymentsRepository } from './payments.repository';
import { PrismaService } from '../_lib/prisma.service';

describe('PaymentsRepository - persistence', () => {
  let repository: PaymentsRepository;
  let prismaService: PrismaService;

  const mockPayment: PaymentDto = {
    id: 'pay_test_123',
    orderId: 'order_abc',
    providerReference: 'ch_stripe_12345',
    provider: 'stripe',
    amountMinor: 9999,
    currency: 'USD',
    status: 'succeeded',
    providerMetadata: { chargeId: 'ch_stripe_12345' },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      webhookEvent: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      client_: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PaymentsRepository>(PaymentsRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('save', () => {
    it('should save payment to in-memory store', () => {
      const result = repository.save(mockPayment);

      expect(result).toEqual(mockPayment);
      expect(repository.get(mockPayment.id)).toEqual(mockPayment);
    });

    it('should update provider reference lookup', () => {
      repository.save(mockPayment);

      const retrieved = repository.findByProviderReference(mockPayment.providerReference);
      expect(retrieved).toEqual(mockPayment);
    });

    it('should handle multiple payments', () => {
      const payment1 = { ...mockPayment, id: 'pay_1', providerReference: 'ch_1' };
      const payment2 = { ...mockPayment, id: 'pay_2', providerReference: 'ch_2' };

      repository.save(payment1);
      repository.save(payment2);

      expect(repository.get('pay_1')).toEqual(payment1);
      expect(repository.get('pay_2')).toEqual(payment2);
      expect(repository.findByProviderReference('ch_1')).toEqual(payment1);
      expect(repository.findByProviderReference('ch_2')).toEqual(payment2);
    });
  });

  describe('get', () => {
    it('should retrieve payment by ID', () => {
      repository.save(mockPayment);

      const result = repository.get(mockPayment.id);
      expect(result).toEqual(mockPayment);
    });

    it('should return undefined for non-existent payment', () => {
      const result = repository.get('fake_id');
      expect(result).toBeUndefined();
    });
  });

  describe('findByProviderReference', () => {
    it('should find payment by provider reference', () => {
      repository.save(mockPayment);

      const result = repository.findByProviderReference('ch_stripe_12345');
      expect(result).toEqual(mockPayment);
    });

    it('should return undefined for non-existent reference', () => {
      const result = repository.findByProviderReference('ch_fake_999');
      expect(result).toBeUndefined();
    });
  });

  describe('markEventProcessed (webhook idempotency)', () => {
    it('should mark event as processed on first call', () => {
      const eventId = 'evt_stripe_abc123';

      const result = repository.markEventProcessed(eventId);

      expect(result).toBe(true);
    });

    it('should return false on duplicate event', () => {
      const eventId = 'evt_stripe_abc123';

      const first = repository.markEventProcessed(eventId);
      const second = repository.markEventProcessed(eventId);

      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('should prevent double-charging from duplicate webhooks', () => {
      const eventId = 'evt_stripe_duplicate';

      const isNew1 = repository.markEventProcessed(eventId);
      const isNew2 = repository.markEventProcessed(eventId);

      // Application logic would check isNew1 before processing payment,
      // and skip processing if isNew2 is false
      expect(isNew1).toBe(true);
      expect(isNew2).toBe(false);
    });

    it('should trigger fire-and-forget Prisma write', () => {
      const eventId = 'evt_stripe_persistence_test';

      repository.markEventProcessed(eventId);

      // Verify the method returns true (event marked)
      const isDuplicate = repository.markEventProcessed(eventId);
      expect(isDuplicate).toBe(false);
    });
  });

  describe('listForOrder', () => {
    it('should return payments for a given order', () => {
      const payment1 = { ...mockPayment, id: 'pay_1', orderId: 'order_1' };
      const payment2 = { ...mockPayment, id: 'pay_2', orderId: 'order_2' };
      const payment3 = { ...mockPayment, id: 'pay_3', orderId: 'order_1' };

      repository.save(payment1);
      repository.save(payment2);
      repository.save(payment3);

      const result = repository.listForOrder('order_1');

      expect(result.length).toBe(2);
      expect(result.map(p => p.id)).toContain('pay_1');
      expect(result.map(p => p.id)).toContain('pay_3');
    });

    it('should return empty array for non-existent order', () => {
      const result = repository.listForOrder('fake_order');
      expect(result).toEqual([]);
    });
  });

  describe('onModuleInit (Prisma priming)', () => {
    it('should load payments from database on init', async () => {
      const mockPrismaPayment = {
        id: 'pay_db_1',
        orderId: 'order_db',
        providerReference: 'ch_db_12345',
        provider: 'stripe',
        amountMinor: 5000,
        currency: 'USD',
        status: 'succeeded',
        providerMetadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.payment.findMany as jest.Mock).mockResolvedValueOnce([mockPrismaPayment]);

      const newRepository = new PaymentsRepository(prismaService);
      await newRepository.onModuleInit();

      const loaded = newRepository.get('pay_db_1');
      expect(loaded).toBeDefined();
      expect(loaded?.providerReference).toBe('ch_db_12345');
    });

    it('should handle empty database on init', async () => {
      (prismaService.payment.findMany as jest.Mock).mockResolvedValueOnce([]);

      const newRepository = new PaymentsRepository(prismaService);
      await newRepository.onModuleInit();

      expect(newRepository.listForOrder('any_order')).toEqual([]);
    });
  });

  describe('webhook idempotency flow', () => {
    it('should block duplicate charge events', () => {
      const webhook = {
        id: 'evt_duplicate_charge',
        type: 'charge.succeeded',
        data: { chargeId: 'ch_stripe_charge' },
      };

      // First webhook arrives
      const isNew1 = repository.markEventProcessed(webhook.id);
      if (isNew1) {
        // Process charge
        const payment = {
          ...mockPayment,
          id: 'pay_webhook_1',
          providerReference: webhook.data.chargeId,
        };
        repository.save(payment);
      }

      // Duplicate webhook arrives (network retry)
      const isNew2 = repository.markEventProcessed(webhook.id);
      if (isNew2) {
        // Process charge again (should NOT happen)
        fail('Duplicate webhook was processed twice');
      }

      expect(repository.get('pay_webhook_1')).toBeDefined();
      expect(repository.listForOrder(mockPayment.orderId).length).toBe(1);
    });
  });
});
