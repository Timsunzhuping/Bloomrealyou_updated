import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  SUPPORTED_CURRENCIES,
  PRODUCT_CATEGORIES,
  QUOTE_NOTES_MAX_LENGTH,
  QUOTE_STATUSES,
  type Currency,
  type ProductCategory,
  type QuoteStatus,
} from '@custom-merch/shared';

class QuoteItemBody {
  @IsString() @IsOptional() productId?: string;
  @IsString() @MaxLength(500) description!: string;
  @IsIn([...PRODUCT_CATEGORIES]) @IsOptional() category?: ProductCategory;
  @IsInt() @Min(1) quantity!: number;
  @IsInt() @Min(0) unitPriceMinor!: number;
  @IsString() @IsOptional() @MaxLength(500) notes?: string;
}

class AddressBody {
  @IsString() fullName!: string;
  @IsString() @IsOptional() company?: string;
  @IsString() line1!: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() city!: string;
  @IsString() @IsOptional() state?: string;
  @IsString() postalCode!: string;
  @IsString() country!: string;
  @IsString() @IsOptional() phone?: string;
}

export class CreateQuoteBody {
  @IsIn([...SUPPORTED_CURRENCIES])
  @IsOptional()
  currency?: Currency;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemBody)
  items!: QuoteItemBody[];

  @IsInt() @Min(0) @IsOptional() shippingMinor?: number;
  @IsInt() @Min(0) @IsOptional() taxMinor?: number;
  @IsInt() @Min(0) @IsOptional() discountMinor?: number;

  @IsISO8601() @IsOptional() validUntil?: string;
  @IsString() @IsOptional() @MaxLength(QUOTE_NOTES_MAX_LENGTH) termsText?: string;
  @IsString() @IsOptional() @MaxLength(QUOTE_NOTES_MAX_LENGTH) internalNotes?: string;
}

export class UpdateQuoteBody {
  @IsIn([...QUOTE_STATUSES]) @IsOptional() status?: QuoteStatus;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemBody)
  @IsOptional()
  items?: QuoteItemBody[];

  @IsInt() @Min(0) @IsOptional() shippingMinor?: number;
  @IsInt() @Min(0) @IsOptional() taxMinor?: number;
  @IsInt() @Min(0) @IsOptional() discountMinor?: number;
  @IsISO8601() @IsOptional() validUntil?: string;
  @IsString() @IsOptional() @MaxLength(QUOTE_NOTES_MAX_LENGTH) termsText?: string;
  @IsString() @IsOptional() @MaxLength(QUOTE_NOTES_MAX_LENGTH) internalNotes?: string;
}

export class ConvertQuoteBody {
  @IsObject()
  @ValidateNested()
  @Type(() => AddressBody)
  shippingAddress!: AddressBody;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressBody)
  billingAddress?: AddressBody;

  @IsIn(['standard', 'express', 'rush'])
  @IsOptional()
  shippingMethod?: 'standard' | 'express' | 'rush';

  @IsString() @IsOptional() @MaxLength(QUOTE_NOTES_MAX_LENGTH) notes?: string;
}
