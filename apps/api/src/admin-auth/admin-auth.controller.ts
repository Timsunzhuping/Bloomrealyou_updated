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

import { AdminLoginBody } from './admin-auth.dto';
import { ADMIN_USER_REQ_KEY } from './admin-auth.tokens';
import { AdminBearerGuard } from './admin-bearer.guard';
import { AdminUsersRepository } from './admin-users.repository';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly users: AdminUsersRepository) {}

  /** POST /admin/auth/login */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: AdminLoginBody): AdminLoginResponse {
    const user = this.users.authenticate(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const token = this.users.issueSession(user.id);
    return { token, user: this.users.toDto(user) };
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
