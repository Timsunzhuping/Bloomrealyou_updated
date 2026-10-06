import { PRINT_METHODS, PRODUCT_CATEGORIES, SUPPORTED_CURRENCIES } from '@custom-merch/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsDefined,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import type { Currency, ListingDraft, PrintMethod, ProductCategory } from '@custom-merch/shared';

export class ListingRevisionBody {
  @IsInt() @Min(0) revision!: number;
}

export class CreateListingBody {
  @IsIn(['zh-CN', 'en', 'es', 'ar']) @IsOptional() locale?: string;
}

export class ListingPatchBody implements Partial<ListingDraft> {
  @IsString() @MaxLength(200) @IsOptional() nameZh?: string;
  @IsString() @MaxLength(200) @IsOptional() nameEn?: string;
  @IsString() @MaxLength(500) @IsOptional() descriptionZh?: string;
  @IsString() @MaxLength(500) @IsOptional() descriptionEn?: string;
  @IsString() @MaxLength(200) @Matches(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/) @IsOptional() slug?: string;
  @IsIn(['', ...PRODUCT_CATEGORIES]) @IsOptional() category?: ProductCategory | '';
  @IsString() @Matches(/^$|^\d{1,7}(?:\.\d{1,2})?$/) @IsOptional() price?: string;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsString() @MaxLength(200) @IsOptional() material?: string;
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  colors?: string[];
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  sizes?: string[];
  @IsInt() @Min(0) @Max(365) @IsOptional() productionLeadDays?: number | null;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(6)
  @IsIn([...PRINT_METHODS], { each: true })
  @IsOptional()
  printMethods?: PrintMethod[];
  @IsInt() @Min(1) @Max(20000) @IsOptional() widthPx?: number | null;
  @IsInt() @Min(1) @Max(20000) @IsOptional() heightPx?: number | null;
  @IsInt() @Min(0) @Max(20000) @IsOptional() offsetXPx?: number | null;
  @IsInt() @Min(0) @Max(20000) @IsOptional() offsetYPx?: number | null;
  @IsBoolean() @IsOptional() printAreaConfirmed?: boolean;
}

export class PatchListingBody extends ListingRevisionBody {
  @IsDefined() @ValidateNested() @Type(() => ListingPatchBody) patch!: ListingPatchBody;
}

export class ListingMessageBody extends ListingRevisionBody {
  @IsString() @MaxLength(3000) @Matches(/\S/) message!: string;
}

export class ListingUploadBody extends ListingRevisionBody {
  @IsString() @MaxLength(150) name!: string;
  @IsString() @MaxLength(7_000_000) dataUrl!: string;
}

export class ListingEnhanceBody extends ListingRevisionBody {
  @IsString() @MaxLength(80) imageId!: string;
  @IsIn(['studio', 'clean']) mode!: 'studio' | 'clean';
}

export class ListingImagesBody extends ListingRevisionBody {
  @IsArray() @ArrayMaxSize(8) @ArrayUnique() @IsString({ each: true }) selectedImageIds!: string[];
  @IsString() @IsOptional() mainImageId?: string | null;
  @IsString() @IsOptional() approveImageId?: string;
}

export class CommitListingBody extends ListingRevisionBody {
  @IsIn(['draft', 'active']) status!: 'draft' | 'active';
  @IsBoolean() confirmed!: boolean;
}
