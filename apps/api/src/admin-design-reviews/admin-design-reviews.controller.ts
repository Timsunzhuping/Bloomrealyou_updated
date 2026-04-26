import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  AdminDesignReviewDto,
  AdminUserDto,
  DesignReviewDecisionResult,
  DesignStatus,
} from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  ApproveDesignBody,
  RejectDesignBody,
  RequestRevisionBody,
} from './admin-design-reviews.dto';
import { AdminDesignReviewsService } from './admin-design-reviews.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/design-reviews')
@UseGuards(AdminBearerGuard)
export class AdminDesignReviewsController {
  constructor(private readonly service: AdminDesignReviewsService) {}

  @Get()
  @RequirePermission('design-reviews.read')
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminDesignReviewDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      status: status as DesignStatus | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('design-reviews.read')
  get(@Param('id') id: string): AdminDesignReviewDto {
    return this.service.get(id);
  }

  @Post(':id/approve')
  @RequirePermission('design-reviews.write')
  @HttpCode(200)
  approve(
    @Param('id') id: string,
    @Body() body: ApproveDesignBody,
    @Req() req: ReqWithAdmin,
  ): DesignReviewDecisionResult {
    return this.service.approve(id, body.note, actor(req));
  }

  @Post(':id/reject')
  @RequirePermission('design-reviews.write')
  @HttpCode(200)
  reject(
    @Param('id') id: string,
    @Body() body: RejectDesignBody,
    @Req() req: ReqWithAdmin,
  ): DesignReviewDecisionResult {
    return this.service.reject(id, { reason: body.reason, note: body.note }, actor(req));
  }

  @Post(':id/request-revision')
  @RequirePermission('design-reviews.write')
  @HttpCode(200)
  requestRevision(
    @Param('id') id: string,
    @Body() body: RequestRevisionBody,
    @Req() req: ReqWithAdmin,
  ): DesignReviewDecisionResult {
    return this.service.requestRevision(id, { message: body.message, note: body.note }, actor(req));
  }
}
