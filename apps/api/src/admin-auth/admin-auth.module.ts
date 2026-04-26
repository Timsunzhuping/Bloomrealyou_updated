import { Module } from '@nestjs/common';

import { AdminAuthController } from './admin-auth.controller';
import { AdminBearerGuard } from './admin-bearer.guard';
import { AdminUsersRepository } from './admin-users.repository';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminUsersRepository, AdminBearerGuard],
  exports: [AdminUsersRepository, AdminBearerGuard],
})
export class AdminAuthModule {}
