import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PRINT_METHODS, SUPPORTED_CURRENCIES, type Currency, type PrintMethod } from '@custom-merch/shared';

export class CalculatePricingBody {
  @IsString()
  productId!: string;

  @IsString()
  @IsOptional()
  variantId?: string | null;

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

  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsBoolean()
  @IsOptional()
  rush?: boolean;

  @IsIn([...SUPPORTED_CURRENCIES])
  @IsOptional()
  currency?: Currency;
}
