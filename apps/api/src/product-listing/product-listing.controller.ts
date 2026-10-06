import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  CommitListingBody,
  CreateListingBody,
  ListingEnhanceBody,
  ListingImagesBody,
  ListingMessageBody,
  ListingUploadBody,
  PatchListingBody,
} from './product-listing.dto';
import { ProductListingService } from './product-listing.service';

import type { AdminUserDto } from '@custom-merch/shared';

interface AdminRequest {
  [ADMIN_USER_REQ_KEY]: AdminUserDto;
}

@Controller('admin/product-listings')
@UseGuards(AdminBearerGuard)
@RequirePermission('products.write')
export class ProductListingController {
  constructor(private readonly service: ProductListingService) {}
  @Get() list(@Req() req: AdminRequest) {
    return this.service.list(req[ADMIN_USER_REQ_KEY]);
  }
  @Post() create(@Body() body: CreateListingBody, @Req() req: AdminRequest) {
    return this.service.create(req[ADMIN_USER_REQ_KEY], body.locale);
  }
  @Get(':id') get(@Param('id') id: string, @Req() req: AdminRequest) {
    return this.service.get(id, req[ADMIN_USER_REQ_KEY]);
  }
  @Patch(':id') patch(
    @Param('id') id: string,
    @Body() body: PatchListingBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.patch(id, body.revision, body.patch, req[ADMIN_USER_REQ_KEY]);
  }
  @Post(':id/messages') message(
    @Param('id') id: string,
    @Body() body: ListingMessageBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.message(id, body.revision, body.message, req[ADMIN_USER_REQ_KEY]);
  }
  @Post(':id/images') upload(
    @Param('id') id: string,
    @Body() body: ListingUploadBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.upload(id, body.revision, body.name, body.dataUrl, req[ADMIN_USER_REQ_KEY]);
  }
  @Post(':id/enhance') enhance(
    @Param('id') id: string,
    @Body() body: ListingEnhanceBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.enhance(
      id,
      body.revision,
      body.imageId,
      body.mode,
      req[ADMIN_USER_REQ_KEY],
    );
  }
  @Post(':id/image-selection') images(
    @Param('id') id: string,
    @Body() body: ListingImagesBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.selectImages(
      id,
      body.revision,
      body.selectedImageIds,
      body.mainImageId,
      body.approveImageId,
      req[ADMIN_USER_REQ_KEY],
    );
  }
  @Post(':id/commit') commit(
    @Param('id') id: string,
    @Body() body: CommitListingBody,
    @Req() req: AdminRequest,
  ) {
    return this.service.commit(
      id,
      body.revision,
      body.status,
      body.confirmed,
      req[ADMIN_USER_REQ_KEY],
    );
  }
}
