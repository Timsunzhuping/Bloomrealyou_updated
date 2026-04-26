import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  ADMIN_ROLE_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
  type AdminUserDto,
  type Locale,
} from '@custom-merch/shared';

interface StoredAdminUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  fullName: string;
  role: AdminRole;
  locale: Locale;
  avatarUrl?: string | null;
  createdAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  issuedAt: string;
}

/**
 * In-memory admin user store. Drop-in replacement for the future Prisma table.
 * Seeds one user per role so the back-office can be exercised end-to-end with
 * just an email / password pair.
 */
@Injectable()
export class AdminUsersRepository {
  private readonly users = new Map<string, StoredAdminUser>();
  private readonly byEmail = new Map<string, string>();
  private readonly sessions = new Map<string, StoredSession>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const seeds: Array<{
      email: string;
      password: string;
      fullName: string;
      role: AdminRole;
      locale: Locale;
    }> = [
      { email: 'admin@bloomrealyou.com', password: 'admin123', fullName: 'Platform Admin', role: 'admin', locale: 'en' },
      { email: 'sales@bloomrealyou.com', password: 'sales123', fullName: 'Sam Sales', role: 'sales', locale: 'en' },
      { email: 'designer@bloomrealyou.com', password: 'designer123', fullName: 'Dana Designer', role: 'designer', locale: 'en' },
      { email: 'pm@bloomrealyou.com', password: 'pm123', fullName: 'Pat Production', role: 'production_manager', locale: 'en' },
      { email: 'finance@bloomrealyou.com', password: 'finance123', fullName: 'Fin Finance', role: 'finance', locale: 'en' },
      { email: 'supplier@bloomrealyou.com', password: 'supplier123', fullName: 'Si Supplier', role: 'supplier_user', locale: 'en' },
    ];
    for (const seed of seeds) {
      const salt = randomBytes(8).toString('hex');
      this.create({
        email: seed.email,
        passwordHash: this.hash(seed.password, salt),
        passwordSalt: salt,
        fullName: seed.fullName,
        role: seed.role,
        locale: seed.locale,
      });
    }
  }

  private create(input: {
    email: string;
    passwordHash: string;
    passwordSalt: string;
    fullName: string;
    role: AdminRole;
    locale: Locale;
    avatarUrl?: string | null;
  }): StoredAdminUser {
    const user: StoredAdminUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      fullName: input.fullName,
      role: input.role,
      locale: input.locale,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.byEmail.set(user.email, user.id);
    return user;
  }

  /** Returns the user when credentials match, or null. Constant-time compare. */
  authenticate(email: string, password: string): StoredAdminUser | null {
    const id = this.byEmail.get(email.toLowerCase());
    if (!id) return null;
    const user = this.users.get(id);
    if (!user) return null;
    const candidate = this.hash(password, user.passwordSalt);
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(user.passwordHash, 'hex');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? user : null;
  }

  /** Issue an opaque session token. The full table is in-memory; future swap to JWT. */
  issueSession(userId: string): string {
    const token = `at_${randomBytes(24).toString('hex')}`;
    this.sessions.set(token, {
      token,
      userId,
      issuedAt: new Date().toISOString(),
    });
    return token;
  }

  resolveSession(token: string): StoredAdminUser | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    return this.users.get(session.userId) ?? null;
  }

  revokeSession(token: string): void {
    this.sessions.delete(token);
  }

  toDto(user: StoredAdminUser): AdminUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: permissionsForRole(user.role),
      locale: user.locale,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
    };
  }

  private hash(password: string, salt: string): string {
    // HMAC-SHA-256 with a per-user salt is sufficient for the MVP's seed users.
    // Production should swap in Argon2id / bcrypt; the public surface stays the same.
    return createHmac('sha256', salt).update(password).digest('hex');
  }
}

function permissionsForRole(role: AdminRole): AdminPermission[] {
  return [...ADMIN_ROLE_PERMISSIONS[role]];
}
