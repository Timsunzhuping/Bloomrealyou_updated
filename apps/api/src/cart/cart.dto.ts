import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PRINT_METHODS, type CheckoutShippingMethod, type PrintMethod } from '@custom-merch/shared';

const CHECKOUT_SHIPPING_METHODS = ['standard', 'express', 'rush'] as const;

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

  @IsIn([...CHECKOUT_SHIPPING_METHODS])
  @IsOptional()
  shippingMethod?: CheckoutShippingMethod;

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

  @IsIn([...CHECKOUT_SHIPPING_METHODS])
  @IsOptional()
  shippingMethod?: CheckoutShippingMethod;
}

export class RecalculateCartBody {
  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsIn([...CHECKOUT_SHIPPING_METHODS])
  @IsOptional()
  shippingMethod?: CheckoutShippingMethod;

  @IsBoolean()
  @IsOptional()
  rush?: boolean;
}
