import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  SUPPLIER_STATUSES,
  SUPPORTED_CURRENCIES,
  type Currency,
  type PrintMethod,
  type ProductCategory,
  type SupplierStatus,
} from '@custom-merch/shared';

const SUPPLIER_MAPPING_STATUSES = ['active', 'paused', 'inactive'] as const;
type SupplierMappingStatus = (typeof SUPPLIER_MAPPING_STATUSES)[number];

export class CreateSupplierBody {
  @IsString() @MaxLength(200) name!: string;

  @IsString() @Length(2, 2, { message: 'country must be ISO-3166-1 alpha-2' }) country!: string;

  @IsString() @IsOptional() @MaxLength(120) region?: string;

  @IsString() @MaxLength(200) contactName!: string;
  @IsEmail() @MaxLength(320) contactEmail!: string;
  @IsString() @IsOptional() @MaxLength(40) contactPhone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_CATEGORIES.length)
  @IsIn([...PRODUCT_CATEGORIES], { each: true })
  supportedCategories!: ProductCategory[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRINT_METHODS.length)
  @IsIn([...PRINT_METHODS], { each: true })
  supportedPrintMethods!: PrintMethod[];

  @IsInt() @Min(1) minOrderQuantity!: number;
  @IsInt() @Min(1) @Max(60) averageProductionDays!: number;

  @IsNumber() @Min(0) @Max(100) @IsOptional() qualityScore?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() onTimeRate?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() returnRate?: number;

  @IsBoolean() @IsOptional() supportsWhiteLabel?: boolean;
  @IsBoolean() @IsOptional() supportsSample?: boolean;

  @IsIn([...SUPPLIER_STATUSES]) @IsOptional() status?: SupplierStatus;

  @IsString() @IsOptional() @MaxLength(2000) notes?: string;
}

export class UpdateSupplierBody {
  @IsString() @IsOptional() @MaxLength(200) name?: string;
  @IsString() @IsOptional() @Length(2, 2) country?: string;
  @IsString() @IsOptional() @MaxLength(120) region?: string | null;
  @IsString() @IsOptional() @MaxLength(200) contactName?: string;
  @IsEmail() @IsOptional() @MaxLength(320) contactEmail?: string;
  @IsString() @IsOptional() @MaxLength(40) contactPhone?: string | null;

  @IsArray()
  @ArrayMaxSize(PRODUCT_CATEGORIES.length)
  @IsIn([...PRODUCT_CATEGORIES], { each: true })
  @IsOptional()
  supportedCategories?: ProductCategory[];

  @IsArray()
  @ArrayMaxSize(PRINT_METHODS.length)
  @IsIn([...PRINT_METHODS], { each: true })
  @IsOptional()
  supportedPrintMethods?: PrintMethod[];

  @IsInt() @Min(1) @IsOptional() minOrderQuantity?: number;
  @IsInt() @Min(1) @Max(60) @IsOptional() averageProductionDays?: number;
  @IsNumber() @Min(0) @Max(100) @IsOptional() qualityScore?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() onTimeRate?: number;
  @IsNumber() @Min(0) @Max(1) @IsOptional() returnRate?: number;
  @IsBoolean() @IsOptional() supportsWhiteLabel?: boolean;
  @IsBoolean() @IsOptional() supportsSample?: boolean;
  @IsIn([...SUPPLIER_STATUSES]) @IsOptional() status?: SupplierStatus;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string | null;
}

export class CreateMappingBody {
  @IsString() supplierId!: string;
  @IsString() productId!: string;
  @IsString() @IsOptional() variantId?: string;
  @IsString() @MaxLength(120) supplierSku!: string;

  @IsInt() @Min(0) costPriceMinor!: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;

  @IsInt() @Min(1) @Max(60) productionDays!: number;
  @IsInt() @Min(1) minOrderQuantity!: number;
  @IsInt() @Min(1) maxDailyCapacity!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRINT_METHODS.length)
  @IsIn([...PRINT_METHODS], { each: true })
  printMethods!: PrintMethod[];

  @IsIn([...SUPPLIER_MAPPING_STATUSES]) @IsOptional() status?: SupplierMappingStatus;
}

export class UpdateMappingBody {
  @IsString() @IsOptional() @MaxLength(120) supplierSku?: string;
  @IsInt() @Min(0) @IsOptional() costPriceMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsInt() @Min(1) @Max(60) @IsOptional() productionDays?: number;
  @IsInt() @Min(1) @IsOptional() minOrderQuantity?: number;
  @IsInt() @Min(1) @IsOptional() maxDailyCapacity?: number;
  @IsArray()
  @ArrayMaxSize(PRINT_METHODS.length)
  @IsIn([...PRINT_METHODS], { each: true })
  @IsOptional()
  printMethods?: PrintMethod[];
  @IsIn([...SUPPLIER_MAPPING_STATUSES]) @IsOptional() status?: SupplierMappingStatus;
}

export class RecommendSuppliersBody {
  @IsString() productId!: string;
  @IsString() @IsOptional() variantId?: string;
  @IsIn([...PRODUCT_CATEGORIES]) category!: ProductCategory;
  @IsIn([...PRINT_METHODS]) printMethod!: PrintMethod;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @Length(2, 2) destinationCountry!: string;
  @IsInt() @Min(0) @IsOptional() budgetUnitPriceMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsBoolean() @IsOptional() requireWhiteLabel?: boolean;
}
