import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AdminDashboardSnapshot } from '@custom-merch/shared';

import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminBearerGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  /** GET /admin/dashboard — operational snapshot for the back-office home. */
  @Get()
  @RequirePermission('dashboard.read')
  get(): AdminDashboardSnapshot {
    return this.service.snapshot();
  }
}
