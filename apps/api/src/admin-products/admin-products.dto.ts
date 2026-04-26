import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  SUPPORTED_CURRENCIES,
  type Currency,
  type LocalisedString,
  type PrintMethod,
  type ProductCategory,
  type ProductStatus,
} from '@custom-merch/shared';

class LocalisedStringBody implements LocalisedString {
  @IsString() @MaxLength(500) en!: string;
  @IsString() @IsOptional() @MaxLength(500) 'zh-CN'?: string;
  @IsString() @IsOptional() @MaxLength(500) es?: string;
  @IsString() @IsOptional() @MaxLength(500) ar?: string;
}

export class CreateProductBody {
  @IsString() @MaxLength(200) slug!: string;
  @IsIn([...PRODUCT_CATEGORIES]) category!: ProductCategory;
  @IsIn([...PRODUCT_STATUSES]) @IsOptional() status?: ProductStatus;

  @ValidateNested() @Type(() => LocalisedStringBody) name!: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) description!: LocalisedStringBody;

  @IsArray() @IsIn([...PRINT_METHODS], { each: true }) supportedPrintMethods!: PrintMethod[];

  @IsArray() @IsString({ each: true }) @IsOptional() @ArrayMaxSize(20) imageUrls?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() @ArrayMaxSize(20) imageDataUrls?: string[];

  @IsInt() @Min(0) basePriceMinor!: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;

  @IsArray() @IsString({ each: true }) @IsOptional() @ArrayMaxSize(20) tags?: string[];

  @IsInt() @Min(0) @IsOptional() productionLeadDays?: number;

  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() seoTitle?: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() seoDescription?: LocalisedStringBody;
}

export class UpdateProductBody {
  @IsString() @IsOptional() @MaxLength(200) slug?: string;
  @IsIn([...PRODUCT_CATEGORIES]) @IsOptional() category?: ProductCategory;
  @IsIn([...PRODUCT_STATUSES]) @IsOptional() status?: ProductStatus;

  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() name?: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() description?: LocalisedStringBody;

  @IsArray() @IsIn([...PRINT_METHODS], { each: true }) @IsOptional() supportedPrintMethods?: PrintMethod[];

  @IsArray() @IsString({ each: true }) @IsOptional() imageUrls?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() imageDataUrls?: string[];

  @IsInt() @Min(0) @IsOptional() basePriceMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;

  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];

  @IsInt() @Min(0) @IsOptional() productionLeadDays?: number;

  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() seoTitle?: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() seoDescription?: LocalisedStringBody;
}

export class UpsertVariantBody {
  @IsString() productId!: string;
  @IsString() @IsOptional() id?: string;
  @IsString() @MaxLength(120) sku!: string;
  @IsObject() attributes!: Record<string, string>;
  @IsInt() @Min(0) unitPriceMinor!: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsInt() @Min(0) @IsOptional() weightGrams?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class UpsertPrintAreaBody {
  @IsString() productId!: string;
  @IsString() @IsOptional() id?: string;
  @IsString() @MaxLength(80) key!: string;
  @ValidateNested() @Type(() => LocalisedStringBody) label!: LocalisedStringBody;
  @IsInt() @Min(1) widthPx!: number;
  @IsInt() @Min(1) heightPx!: number;
  @IsInt() mockupOffsetXPx!: number;
  @IsInt() mockupOffsetYPx!: number;
  @IsArray() @IsIn([...PRINT_METHODS], { each: true }) allowedPrintMethods!: PrintMethod[];
}

export class UpsertPriceTierBody {
  @IsString() productId!: string;
  @IsString() @IsOptional() id?: string;
  @IsInt() @Min(1) minQuantity!: number;
  @IsInt() @Min(1) @IsOptional() maxQuantity?: number | null;
  @IsInt() @Min(0) unitPriceMinor!: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsIn([...PRINT_METHODS]) @IsOptional() printMethod?: PrintMethod;
}
