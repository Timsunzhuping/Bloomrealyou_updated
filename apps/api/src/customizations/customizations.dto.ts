import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { DESIGN_STATUSES, type DesignStatus } from '@custom-merch/shared';

export class CreateCustomerDesignBody {
  @IsString()
  productId!: string;

  @IsString()
  @IsOptional()
  variantId?: string | null;

  @IsString()
  @IsOptional()
  templateId?: string | null;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  designJson!: Record<string, unknown>;

  @IsString()
  @IsOptional()
  previewDataUrl?: string;

  @IsString()
  @IsOptional()
  ownerUserId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string | null;
}

export class UpdateCustomerDesignBody {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn([...DESIGN_STATUSES])
  @IsOptional()
  status?: DesignStatus;

  @IsObject()
  @IsOptional()
  designJson?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  previewDataUrl?: string;

  @IsString()
  @IsOptional()
  reviewerNotes?: string;
}

export class RenderPreviewBody {
  @IsString()
  @IsOptional()
  previewDataUrl?: string;
}

export class GenerateProductionFileBody {
  @IsArray()
  @IsIn(['png', 'svg', 'pdf', 'json'], { each: true })
  @IsOptional()
  formats?: Array<'png' | 'svg' | 'pdf' | 'json'>;

  @IsString()
  @IsOptional()
  productionDataUrl?: string;
}

export class ValidateDesignBody {
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  designJson?: Record<string, unknown>;
}
