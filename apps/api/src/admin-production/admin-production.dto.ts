import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  PRINT_METHODS,
  PRODUCTION_JOB_STATUSES,
  SUPPORTED_CURRENCIES,
  type Currency,
  type PrintMethod,
  type ProductionJobStatus,
} from '@custom-merch/shared';

export class CreateProductionJobBody {
  @IsString() orderId!: string;

  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) orderItemIds!: string[];

  @IsIn([...PRINT_METHODS]) printMethod!: PrintMethod;

  @IsInt() @Min(1) quantity!: number;

  @IsString() @IsOptional() supplierId?: string;
}

export class UpdateProductionJobStatusBody {
  @IsIn([...PRODUCTION_JOB_STATUSES]) status!: ProductionJobStatus;

  @IsString() @IsOptional() @MaxLength(2000) note?: string;
  @IsString() @IsOptional() @MaxLength(2000) failureReason?: string;
}

export class AssignProductionSupplierBody {
  @IsString() supplierId!: string;
  @IsInt() @Min(0) @IsOptional() unitCostMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsISO8601() @IsOptional() expectedReadyAt?: string;
}

export class UploadQcResultBody {
  @IsBoolean() passed!: boolean;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string;
  /** Up to ~6.5 MB of base64 (matches AI image limit). */
  @IsString() @IsOptional() @MaxLength(10_000_000) attachmentDataUrl?: string;
  @IsString() @IsOptional() @MaxLength(255) attachmentFileName?: string;
  @IsString() @IsOptional() @MaxLength(2000) failureReason?: string;
}
