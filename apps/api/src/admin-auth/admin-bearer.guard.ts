import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  hasAdminPermission,
  type AdminPermission,
} from '@custom-merch/shared';

import { ADMIN_AUDIT_CONTEXT_KEY, ADMIN_USER_REQ_KEY } from './admin-auth.tokens';
import { ADMIN_PERMISSION_KEY } from './admin-permissions.decorator';
import { AdminUsersRepository } from './admin-users.repository';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
}

/**
 * Guard for admin-scoped routes. Reads the bearer token from
 * `Authorization: Bearer <token>`, resolves the user, and (when the route
 * declares `@RequirePermissions()`) checks the RBAC table.
 *
 * Falls back to the `x-admin-token` header so server-side fetches from
 * Next.js (where setting the Authorization header is awkward) still work.
 */
@Injectable()
export class AdminBearerGuard implements CanActivate {
  private readonly log = new Logger(AdminBearerGuard.name);

  constructor(
    private readonly users: AdminUsersRepository,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestLike>();
    const token = readToken(req);
    if (!token) throw new UnauthorizedException('Missing admin token');

    const user = this.users.resolveSession(token);
    if (!user) throw new UnauthorizedException('Invalid admin token');

    const required = this.reflector.getAllAndOverride<AdminPermission | undefined>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (required) {
      const dto = this.users.toDto(user);
      if (!hasAdminPermission(dto.permissions, required)) {
        this.log.warn(`user ${user.email} lacks permission ${required}`);
        throw new UnauthorizedException(`Missing permission: ${required}`);
      }
    }

    const dto = this.users.toDto(user);
    req[ADMIN_USER_REQ_KEY] = dto;
    req[ADMIN_AUDIT_CONTEXT_KEY] = {
      actorUserId: dto.id,
      actorName: dto.fullName,
      actorRole: dto.role,
      ipAddress: extractIp(req),
      userAgent: readHeader(req, 'user-agent'),
    };
    return true;
  }
}

function readToken(req: RequestLike): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice('bearer '.length).trim() || null;
  }
  const direct = req.headers['x-admin-token'];
  if (typeof direct === 'string' && direct.length > 0) return direct;
  return null;
}

function readHeader(req: RequestLike, name: string): string | null {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string') return value;
  return null;
}

/**
 * Extract the real client IP. Honours `X-Forwarded-For` (taking the first
 * entry — that's the original client when standard reverse-proxy chains
 * append) and falls back to `req.ip` / `socket.remoteAddress`. Returns
 * `null` when nothing is available so callers know it's truly unknown.
 */
function extractIp(req: RequestLike): string | null {
  const xff = readHeader(req, 'x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  const r = req as RequestLike & { ip?: string; socket?: { remoteAddress?: string } };
  if (typeof r.ip === 'string' && r.ip.length > 0) return r.ip;
  return r.socket?.remoteAddress ?? null;
}
