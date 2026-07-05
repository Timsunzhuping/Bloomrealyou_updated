import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import type {
  CustomerDesignDto,
  GenerateProductionFileResult,
  RenderPreviewResult,
  ValidationResult,
} from '@custom-merch/shared';

import {
  CreateCustomerDesignBody,
  GenerateProductionFileBody,
  RenderPreviewBody,
  UpdateCustomerDesignBody,
  ValidateDesignBody,
} from './customizations.dto';
import { CustomizationsRepository } from './customizations.repository';
import { CustomizationsService } from './customizations.service';

@Controller('customizations')
export class CustomizationsController {
  constructor(
    private readonly service: CustomizationsService,
    private readonly repo: CustomizationsRepository,
  ) {}

  /** POST /customizations */
  @Post()
  async create(
    @Body() body: CreateCustomerDesignBody,
    @Headers('x-cart-session') sessionId: string | undefined,
  ): Promise<CustomerDesignDto> {
    const dto = await this.service.create({
      productId: body.productId,
      variantId: body.variantId,
      templateId: body.templateId,
      name: body.name,
      designJson: body.designJson,
      previewDataUrl: body.previewDataUrl,
      ownerUserId: body.ownerUserId,
      organizationId: body.organizationId,
    });
    if (sessionId) this.repo.setSession(dto.id, sessionId);
    return dto;
  }

  /** GET /customizations/:id */
  @Get(':id')
  get(@Param('id') id: string): CustomerDesignDto {
    return this.service.get(id);
  }

  /** PATCH /customizations/:id */
  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() body: UpdateCustomerDesignBody,
  ): Promise<CustomerDesignDto> {
    return this.service.patch(id, body);
  }

  /** POST /customizations/:id/render-preview */
  @Post(':id/render-preview')
  @HttpCode(200)
  renderPreview(
    @Param('id') id: string,
    @Body() body: RenderPreviewBody,
  ): Promise<RenderPreviewResult> {
    return this.service.renderPreview(id, body.previewDataUrl);
  }

  /** POST /customizations/:id/generate-production-file */
  @Post(':id/generate-production-file')
  @HttpCode(200)
  generateProductionFile(
    @Param('id') id: string,
    @Body() body: GenerateProductionFileBody,
  ): Promise<GenerateProductionFileResult> {
    return this.service.generateProductionFile(id, body.formats, body.productionDataUrl);
  }

  /** POST /customizations/:id/validate */
  @Post(':id/validate')
  @HttpCode(200)
  validate(@Param('id') id: string, @Body() body: ValidateDesignBody): ValidationResult {
    return this.service.validate(id, body.designJson);
  }
}
