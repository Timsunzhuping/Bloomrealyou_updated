import { Test, TestingModule } from '@nestjs/testing';

import { AdminUsersRepository } from './admin-users.repository';
import { SnapshotStore, type SnapshotRow } from '../_lib/snapshot-store';

describe('AdminUsersRepository - durable sessions', () => {
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  async function makeRepo(): Promise<AdminUsersRepository> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUsersRepository, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();
    return module.get(AdminUsersRepository);
  }

  beforeEach(() => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
  });

  it('should derive a deterministic user id from email (stable across restarts)', async () => {
    const repo1 = await makeRepo();
    const repo2 = await makeRepo();

    const u1 = repo1.authenticate('admin@bloomrealyou.com', 'admin123');
    const u2 = repo2.authenticate('admin@bloomrealyou.com', 'admin123');

    expect(u1).not.toBeNull();
    expect(u1!.id).toBe(u2!.id); // same id on a fresh instance
  });

  it('should write-through a session on issue and remove on revoke', async () => {
    const repo = await makeRepo();
    const user = repo.authenticate('admin@bloomrealyou.com', 'admin123')!;

    const token = repo.issueSession(user.id);
    expect(snapshots.put).toHaveBeenCalledWith(
      'admin_session',
      token,
      expect.objectContaining({ userId: user.id }),
    );

    repo.revokeSession(token);
    expect(snapshots.remove).toHaveBeenCalledWith('admin_session', token);
  });

  it('should restore a session from the durable store after a restart', async () => {
    // First instance issues a session.
    const repo1 = await makeRepo();
    const user = repo1.authenticate('sales@bloomrealyou.com', 'sales123')!;
    const token = repo1.issueSession(user.id);

    // Simulate restart: a fresh instance primed with the persisted session.
    const rows: SnapshotRow<{ token: string; userId: string; issuedAt: string }>[] = [
      { entityId: token, refKey: null, data: { token, userId: user.id, issuedAt: new Date().toISOString() } },
    ];
    snapshots.loadAll.mockResolvedValueOnce(rows);

    const repo2 = await makeRepo();
    await repo2.onModuleInit();

    const resolved = repo2.resolveSession(token);
    expect(resolved).not.toBeNull();
    expect(resolved!.email).toBe('sales@bloomrealyou.com');
  });

  it('should reject an unknown session token', async () => {
    const repo = await makeRepo();
    expect(repo.resolveSession('at_does_not_exist')).toBeNull();
  });
});
