import { Test, TestingModule } from '@nestjs/testing';

import type { AccountProfileDto, SavedAddressDto } from '@custom-merch/shared';

import { AccountRepository } from './account.repository';
import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

describe('AccountRepository - persistence', () => {
  let repository: AccountRepository;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();
    repository = module.get<AccountRepository>(AccountRepository);
  });

  it('should NOT persist on a bare ensureProfile (read-only)', () => {
    repository.ensureProfile('sess_browse');
    expect(snapshots.put).not.toHaveBeenCalled();
  });

  it('should write-through profile updates', () => {
    repository.updateProfile('sess_1', { email: 'a@b.com', fullName: 'Ann' });

    expect(snapshots.put).toHaveBeenCalledWith(
      'account_profile',
      'sess_1',
      expect.objectContaining({ email: 'a@b.com' }),
    );
  });

  it('should write-through address book changes', () => {
    repository.saveAddress('sess_2', {
      fullName: 'Ann',
      line1: '1 St',
      city: 'NYC',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    } as any);

    expect(snapshots.put).toHaveBeenCalledWith(
      'account_addresses',
      'sess_2',
      expect.arrayContaining([expect.objectContaining({ city: 'NYC' })]),
    );
  });

  it('should prime profiles and addresses on init', async () => {
    const profiles: SnapshotRow<AccountProfileDto>[] = [
      {
        entityId: 'sess_db',
        refKey: null,
        data: {
          id: 'sess_db',
          email: 'db@x.com',
          fullName: 'DB User',
          phone: null,
          locale: 'en',
          marketingOptIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];
    const addresses: SnapshotRow<SavedAddressDto[]>[] = [
      { entityId: 'sess_db', refKey: null, data: [{ id: 'addr1', city: 'LA' } as SavedAddressDto] },
    ];
    snapshots.loadAll
      .mockResolvedValueOnce(profiles) // account_profile
      .mockResolvedValueOnce(addresses); // account_addresses

    await repository.onModuleInit();

    expect(repository.ensureProfile('sess_db').email).toBe('db@x.com');
    expect(repository.listAddresses('sess_db').length).toBe(1);
  });
});
