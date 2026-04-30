import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

import { SUPPORTED_LOCALES, type Locale } from '@custom-merch/shared';

export class UpdateProfileBody {
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() phone?: string;
  @IsIn([...SUPPORTED_LOCALES]) @IsOptional() locale?: Locale;
  @IsBoolean() @IsOptional() marketingOptIn?: boolean;
}

export class SaveAddressBody {
  @IsString() @IsOptional() label?: string | null;
  @IsString() fullName!: string;
  @IsString() @IsOptional() company?: string;
  @IsString() line1!: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() city!: string;
  @IsString() @IsOptional() state?: string;
  @IsString() postalCode!: string;
  @IsString() country!: string;
  @IsString() @IsOptional() phone?: string;
  @IsBoolean() @IsOptional() isDefaultShipping?: boolean;
  @IsBoolean() @IsOptional() isDefaultBilling?: boolean;
}

export class UpdateAddressBody {
  @IsString() @IsOptional() label?: string | null;
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() line1?: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() postalCode?: string;
  @IsString() @IsOptional() country?: string;
  @IsString() @IsOptional() phone?: string;
  @IsBoolean() @IsOptional() isDefaultShipping?: boolean;
  @IsBoolean() @IsOptional() isDefaultBilling?: boolean;
}

export class ReorderBody {
  @IsString() @IsOptional() shippingCountry?: string;
  @IsBoolean() @IsOptional() rush?: boolean;
}
