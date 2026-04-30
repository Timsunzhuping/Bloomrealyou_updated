import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AdminTemplateDto, AdminUserDto } from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { CreateTemplateBody, UpdateTemplateBody } from './admin-templates.dto';
import { AdminTemplatesService } from './admin-templates.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/templates')
@UseGuards(AdminBearerGuard)
export class AdminTemplatesController {
  constructor(private readonly service: AdminTemplatesService) {}

  @Get()
  @RequirePermission('templates.read')
  list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('isPublished') isPublished?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminTemplateDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      category,
      isPublished: typeof isPublished === 'string' ? isPublished === 'true' : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('templates.write')
  @HttpCode(201)
  create(@Body() body: CreateTemplateBody, @Req() req: ReqWithAdmin): Promise<AdminTemplateDto> {
    return this.service.create(body, actor(req));
  }

  @Get(':id')
  @RequirePermission('templates.read')
  get(@Param('id') id: string): AdminTemplateDto {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission('templates.write')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() body: UpdateTemplateBody,
    @Req() req: ReqWithAdmin,
  ): Promise<AdminTemplateDto> {
    return this.service.update(id, body, actor(req));
  }

  @Delete(':id')
  @RequirePermission('templates.write')
  @HttpCode(204)
  delete(@Param('id') id: string, @Req() req: ReqWithAdmin): void {
    this.service.delete(id, actor(req));
  }
}
