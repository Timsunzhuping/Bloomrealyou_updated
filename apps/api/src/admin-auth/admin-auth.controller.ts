import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { AdminLoginResponse, AdminUserDto } from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';

import { AdminLoginBody } from './admin-auth.dto';
import { ADMIN_USER_REQ_KEY } from './admin-auth.tokens';
import { AdminBearerGuard } from './admin-bearer.guard';
import { AdminUsersRepository } from './admin-users.repository';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly users: AdminUsersRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  /** POST /admin/auth/login */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: AdminLoginBody, @Req() req: RequestLike): AdminLoginResponse {
    const user = this.users.authenticate(body.email, body.password);
    const ip = readIp(req);
    const ua = readHeader(req, 'user-agent');
    if (!user) {
      this.audit.append({
        entityType: 'AdminUser',
        entityId: body.email.toLowerCase().slice(0, 64),
        action: 'login_failed',
        ipAddress: ip,
        userAgent: ua,
        summary: `failed admin login for ${body.email}`,
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.users.issueSession(user.id);
    const dto = this.users.toDto(user);
    this.audit.append({
      actorUserId: dto.id,
      actorName: dto.fullName,
      actorRole: dto.role,
      entityType: 'AdminUser',
      entityId: dto.id,
      action: 'login',
      ipAddress: ip,
      userAgent: ua,
      summary: `admin login: ${dto.email}`,
    });
    return { token, user: dto };
  }

  /** POST /admin/auth/logout — best-effort; succeeds even if the token is unknown. */
  @Post('logout')
  @HttpCode(204)
  logout(@Headers('authorization') auth?: string): void {
    if (!auth) return;
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m) this.users.revokeSession(m[1]!);
  }

  /** GET /admin/auth/me */
  @Get('me')
  @UseGuards(AdminBearerGuard)
  me(@Req() req: { [ADMIN_USER_REQ_KEY]?: AdminUserDto }): AdminUserDto {
    const user = req[ADMIN_USER_REQ_KEY];
    if (!user) throw new UnauthorizedException('No admin user on request');
    return user;
  }
}

function readIp(req: RequestLike): string | null {
  const xff = req.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xff) ? xff[0] : xff;
  if (typeof xffStr === 'string' && xffStr.length > 0) {
    return xffStr.split(',')[0]?.trim() ?? null;
  }
  if (typeof req.ip === 'string') return req.ip;
  return req.socket?.remoteAddress ?? null;
}

function readHeader(req: RequestLike, name: string): string | null {
  const v = req.headers[name];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === 'string' ? v : null;
}
