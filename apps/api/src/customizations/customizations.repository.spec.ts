import { Test, TestingModule } from '@nestjs/testing';

import type { CustomerDesignDto } from '@custom-merch/shared';

import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

import { CustomizationsRepository } from './customizations.repository';

describe('CustomizationsRepository - persistence', () => {
  let repository: CustomizationsRepository;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    snapshots = {
      loadAll: jest.fn().mockResolvedValue([]),
      put: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomizationsRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();

    repository = module.get<CustomizationsRepository>(CustomizationsRepository);
  });

  it('persists design JSON on create', () => {
    const design = repository.create({
      ownerUserId: 'anonymous',
      productId: 'prod_tee',
      variantId: 'var_black_m',
      name: 'Launch tee',
      designJson: {
        layers: [{ type: 'text', text: 'Bloom' }],
        canvas: { width: 1000, height: 1000 },
      },
      previewImageUrl: '/files/preview.png',
    });

    expect(repository.get(design.id)).toEqual(design);
    expect(snapshots.put).toHaveBeenCalledWith('design', design.id, design, null);
  });

  it('re-persists the owning session as snapshot refKey', () => {
    const design = repository.create({
      ownerUserId: 'anonymous',
      productId: 'prod_tee',
      name: 'Session design',
      designJson: { layers: [] },
    });
    snapshots.put.mockClear();

    repository.setSession(design.id, 'sess_123');

    expect(snapshots.put).toHaveBeenCalledWith(
      'design',
      design.id,
      expect.objectContaining({ id: design.id }),
      'sess_123',
    );
    expect(repository.listForSession('sess_123').map((d) => d.id)).toEqual([design.id]);
  });

  it('persists preview, production URL, and validation updates', () => {
    const design = repository.create({
      ownerUserId: 'anonymous',
      productId: 'prod_tee',
      name: 'Production design',
      designJson: { layers: [] },
    });
    snapshots.put.mockClear();

    repository.setPreviewUrl(design.id, '/files/preview-v2.png');
    repository.setProductionUrl(design.id, '/files/production.pdf');
    repository.setValidation(design.id, {
      ok: true,
      total: 0,
      warnings: [],
      errors: [],
      validatedAt: '2026-07-04T00:00:00.000Z',
    });

    expect(repository.get(design.id)).toMatchObject({
      previewImageUrl: '/files/preview-v2.png',
      productionFileUrl: '/files/production.pdf',
      validationResult: { ok: true },
    });
    expect(snapshots.put).toHaveBeenCalledTimes(3);
  });

  it('primes designs and anonymous session ownership from durable snapshots', async () => {
    const persisted: CustomerDesignDto = {
      id: 'design_db_1',
      ownerUserId: 'anonymous',
      organizationId: null,
      productId: 'prod_tee',
      variantId: 'var_black_m',
      templateId: null,
      name: 'Persisted design',
      status: 'draft',
      designJson: { layers: [{ type: 'image', src: '/uploads/logo.png' }] },
      previewImageUrl: '/files/preview.png',
      productionFileUrl: '/files/production.pdf',
      validationResult: null,
      metadata: null,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };
    const rows: SnapshotRow<CustomerDesignDto>[] = [
      { entityId: persisted.id, refKey: 'sess_db', data: persisted },
    ];
    snapshots.loadAll.mockResolvedValueOnce(rows);

    await repository.onModuleInit();

    expect(snapshots.loadAll).toHaveBeenCalledWith('design');
    expect(repository.get(persisted.id)).toEqual(persisted);
    expect(repository.listForSession('sess_db').map((d) => d.id)).toEqual([persisted.id]);
  });
});
