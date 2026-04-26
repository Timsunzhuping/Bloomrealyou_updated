import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PRINT_METHODS, type PrintMethod } from '@custom-merch/shared';

export class AddCartItemBody {
  @IsString()
  productId!: string;

  @IsString()
  variantId!: string;

  @IsString()
  @IsOptional()
  customizationId?: string | null;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsIn([...PRINT_METHODS])
  @IsOptional()
  printMethod?: PrintMethod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  printAreas?: string[];

  @IsBoolean()
  @IsOptional()
  rush?: boolean;

  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsString()
  @IsOptional()
  previewImageUrl?: string | null;

  @IsString()
  @IsOptional()
  productNameSnapshot?: string;

  @IsString()
  @IsOptional()
  variantSkuSnapshot?: string;
}

export class UpdateCartItemBody {
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsIn([...PRINT_METHODS])
  @IsOptional()
  printMethod?: PrintMethod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  printAreas?: string[];

  @IsBoolean()
  @IsOptional()
  rush?: boolean;

  @IsString()
  @IsOptional()
  shippingCountry?: string;
}

export class RecalculateCartBody {
  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsBoolean()
  @IsOptional()
  rush?: boolean;
}
