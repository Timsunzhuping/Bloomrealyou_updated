import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { SUPPORTED_LOCALES, type Locale } from '@custom-merch/shared';

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

export class CreateOrderBody {
  @IsString() cartSessionId!: string;

  @IsEmail() customerEmail!: string;

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

  @IsIn([...SUPPORTED_LOCALES])
  @IsOptional()
  locale?: Locale;

  @IsString() @IsOptional() notes?: string;
}
