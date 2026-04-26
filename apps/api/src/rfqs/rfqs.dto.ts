import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  PRODUCT_CATEGORIES,
  RFQ_BUDGET_RANGES,
  RFQ_LOGO_MAX_BYTES,
  RFQ_NOTE_MAX_LENGTH,
  RFQ_STATUSES,
  SUPPORTED_LOCALES,
  type Locale,
  type ProductCategory,
  type RFQBudgetRange,
  type RFQStatus,
} from '@custom-merch/shared';

export class CreateRFQBody {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @Length(2, 2, { message: 'country must be ISO-3166-1 alpha-2' })
  country!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_CATEGORIES.length)
  @IsIn([...PRODUCT_CATEGORIES], { each: true })
  productCategories!: ProductCategory[];

  @IsInt()
  @Min(1)
  estimatedQuantity!: number;

  @IsISO8601()
  @IsOptional()
  targetDeliveryDate?: string;

  @IsIn([...RFQ_BUDGET_RANGES])
  budgetRange!: RFQBudgetRange;

  @IsBoolean()
  @IsOptional()
  needSample?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(RFQ_NOTE_MAX_LENGTH)
  note?: string;

  @IsIn([...SUPPORTED_LOCALES])
  @IsOptional()
  locale?: Locale;

  @IsString()
  @IsOptional()
  @MaxLength(RFQ_LOGO_MAX_BYTES)
  logoDataUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  logoFileName?: string;
}

export class UpdateRFQStatusBody {
  @IsIn([...RFQ_STATUSES])
  status!: RFQStatus;

  @IsString()
  @IsOptional()
  @MaxLength(RFQ_NOTE_MAX_LENGTH)
  note?: string;
}
