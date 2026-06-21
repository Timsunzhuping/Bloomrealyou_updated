import { Test, TestingModule } from '@nestjs/testing';

import type { PaymentDto } from '@custom-merch/shared';

import { PaymentsRepository } from './payments.repository';
import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

describe('PaymentsRepository - persistence', () => {
  let repository: PaymentsRepository;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  const mockPayment = {
    id: 'pay_test_123',
    orderId: 'order_abc',
    providerReference: 'ch_stripe_12345',
    provider: 'stripe',
    amountMinor: 9999,
    currency: 'USD',
    status: 'succeeded',
    providerMetadata: { chargeId: 'ch_stripe_12345' },
  } as unknown as PaymentDto;

  beforeEach(async () => {
    snapshots = {
      loadAll: jest.fn().mockResolvedValue([]),
      put: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();

    repository = module.get<PaymentsRepository>(PaymentsRepository);
  });

  describe('save', () => {
    it('should save payment to in-memory store and write-through', () => {
      const result = repository.save(mockPayment);

      expect(result).toEqual(mockPayment);
      expect(repository.get(mockPayment.id)).toEqual(mockPayment);
      expect(snapshots.put).toHaveBeenCalledWith(
        'payment',
        mockPayment.id,
        mockPayment,
        mockPayment.providerReference,
      );
    });

    it('should index by provider reference', () => {
      repository.save(mockPayment);
      expect(repository.findByProviderReference(mockPayment.providerReference)).toEqual(mockPayment);
    });

    it('should handle multiple payments', () => {
      const p1 = { ...mockPayment, id: 'pay_1', providerReference: 'ch_1' };
      const p2 = { ...mockPayment, id: 'pay_2', providerReference: 'ch_2' };

      repository.save(p1);
      repository.save(p2);

      expect(repository.findByProviderReference('ch_1')).toEqual(p1);
      expect(repository.findByProviderReference('ch_2')).toEqual(p2);
    });
  });

  describe('findByProviderReference', () => {
    it('should return undefined for unknown reference', () => {
      expect(repository.findByProviderReference('ch_fake_999')).toBeUndefined();
    });
  });

  describe('markEventProcessed (webhook idempotency)', () => {
    it('should return true on first call, false on duplicate', () => {
      const eventId = 'evt_stripe_abc123';

      expect(repository.markEventProcessed(eventId)).toBe(true);
      expect(repository.markEventProcessed(eventId)).toBe(false);
    });

    it('should write-through the marker on first sight only', () => {
      const eventId = 'evt_stripe_persist';

      repository.markEventProcessed(eventId);
      repository.markEventProcessed(eventId);

      expect(snapshots.put).toHaveBeenCalledTimes(1);
      expect(snapshots.put).toHaveBeenCalledWith(
        'payment_event',
        eventId,
        expect.objectContaining({ eventId }),
      );
    });

    it('should prevent double-charging from duplicate webhooks', () => {
      const eventId = 'evt_stripe_duplicate';

      const first = repository.markEventProcessed(eventId);
      if (first) {
        repository.save({ ...mockPayment, id: 'pay_webhook_1', providerReference: 'ch_wh' });
      }
      const second = repository.markEventProcessed(eventId);
      if (second) {
        fail('Duplicate webhook was processed twice');
      }

      expect(repository.listForOrder(mockPayment.orderId).length).toBe(1);
    });
  });

  describe('listForOrder', () => {
    it('should return payments for a given order', () => {
      repository.save({ ...mockPayment, id: 'pay_1', orderId: 'order_1', providerReference: 'r1' });
      repository.save({ ...mockPayment, id: 'pay_2', orderId: 'order_2', providerReference: 'r2' });
      repository.save({ ...mockPayment, id: 'pay_3', orderId: 'order_1', providerReference: 'r3' });

      const result = repository.listForOrder('order_1');

      expect(result.map((p) => p.id).sort()).toEqual(['pay_1', 'pay_3']);
    });

    it('should return empty array for unknown order', () => {
      expect(repository.listForOrder('fake_order')).toEqual([]);
    });
  });

  describe('onModuleInit (priming from durable store)', () => {
    it('should load payments and webhook markers into memory', async () => {
      const paymentRows: SnapshotRow<PaymentDto>[] = [
        {
          entityId: 'pay_db_1',
          refKey: 'ch_db_12345',
          data: { ...mockPayment, id: 'pay_db_1', providerReference: 'ch_db_12345' },
        },
      ];
      const eventRows: SnapshotRow<{ eventId: string }> = [
        { entityId: 'evt_db_1', refKey: null, data: { eventId: 'evt_db_1' } },
      ] as unknown as SnapshotRow<{ eventId: string }>;

      snapshots.loadAll
        .mockResolvedValueOnce(paymentRows) // KIND = 'payment'
        .mockResolvedValueOnce(eventRows); // EVENT_KIND = 'payment_event'

      await repository.onModuleInit();

      expect(repository.get('pay_db_1')).toBeDefined();
      expect(repository.findByProviderReference('ch_db_12345')?.id).toBe('pay_db_1');
      // The previously-seen event is recognised as a duplicate (returns false).
      expect(repository.markEventProcessed('evt_db_1')).toBe(false);
    });

    it('should handle an empty durable store', async () => {
      snapshots.loadAll.mockResolvedValue([]);
      await repository.onModuleInit();
      expect(repository.listForOrder('any')).toEqual([]);
    });
  });
});
