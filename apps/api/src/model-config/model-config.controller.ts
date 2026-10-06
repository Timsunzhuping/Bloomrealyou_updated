import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { ModelBindingsBody, ModelProfileBody, ModelRevisionBody } from './model-config.dto';
import { ModelConfigurationService } from './model-config.service';

import type { AdminUserDto } from '@custom-merch/shared';
interface AdminRequest {
  [ADMIN_USER_REQ_KEY]: AdminUserDto;
}
@Controller('admin/model-config')
@UseGuards(AdminBearerGuard)
@RequirePermission('settings.write')
export class ModelConfigurationController {
  constructor(private readonly service: ModelConfigurationService) {}
  @Get() @RequirePermission('settings.read') get() {
    return this.service.view();
  }
  @Post('profiles') create(@Body() body: ModelProfileBody, @Req() req: AdminRequest) {
    return this.service.saveProfile(null, body, req[ADMIN_USER_REQ_KEY]);
  }
  @Patch('profiles/:id') update(
    @Param('id') id: string,
    @Body() body: ModelProfileBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.saveProfile(id, body, req[ADMIN_USER_REQ_KEY]);
  }
  @Delete('profiles/:id') remove(
    @Param('id') id: string,
    @Body() body: ModelRevisionBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.removeProfile(id, body.revision, req[ADMIN_USER_REQ_KEY]);
  }
  @Patch('bindings') bind(@Body() body: ModelBindingsBody, @Req() req: AdminRequest) {
    return this.service.bind(
      body.revision,
      body.bindings.map((b) => ({ ...b, profileId: b.profileId ?? null })),
      req[ADMIN_USER_REQ_KEY],
    );
  }
  @Post('profiles/:id/test') test(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.service.test(id, req[ADMIN_USER_REQ_KEY]);
  }
}
