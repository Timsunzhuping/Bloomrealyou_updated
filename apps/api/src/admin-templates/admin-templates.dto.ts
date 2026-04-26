import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import {
  PRODUCT_CATEGORIES,
  type LocalisedString,
  type ProductCategory,
  type TemplateEditableField,
} from '@custom-merch/shared';

class LocalisedStringBody implements LocalisedString {
  @IsString() @MaxLength(500) en!: string;
  @IsString() @IsOptional() @MaxLength(500) 'zh-CN'?: string;
  @IsString() @IsOptional() @MaxLength(500) es?: string;
  @IsString() @IsOptional() @MaxLength(500) ar?: string;
}

class EditableFieldBody implements TemplateEditableField {
  @IsString() @MaxLength(80) key!: string;
  @ValidateNested() @Type(() => LocalisedStringBody) label!: LocalisedStringBody;
  @IsIn(['text', 'image', 'color']) type!: 'text' | 'image' | 'color';
  @IsString() @IsOptional() @MaxLength(500) defaultValue?: string;
  @IsBoolean() @IsOptional() required?: boolean;
}

export class CreateTemplateBody {
  @ValidateNested() @Type(() => LocalisedStringBody) name!: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() description?: LocalisedStringBody;

  @IsArray() @IsIn([...PRODUCT_CATEGORIES], { each: true }) supportedCategories!: ProductCategory[];

  @IsString() @IsOptional() productId?: string;

  @IsString() @IsOptional() previewImageUrl?: string;
  @IsString() @IsOptional() previewDataUrl?: string;

  @IsObject() designJson!: Record<string, unknown>;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EditableFieldBody)
  @IsOptional()
  editableFields?: EditableFieldBody[];

  @IsBoolean() @IsOptional() isFeatured?: boolean;
  @IsBoolean() @IsOptional() isPublished?: boolean;

  @IsArray() @IsString({ each: true }) @IsOptional() @ArrayMaxSize(20) tags?: string[];
}

export class UpdateTemplateBody {
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() name?: LocalisedStringBody;
  @ValidateNested() @Type(() => LocalisedStringBody) @IsOptional() description?: LocalisedStringBody;

  @IsArray() @IsIn([...PRODUCT_CATEGORIES], { each: true }) @IsOptional() supportedCategories?: ProductCategory[];

  @IsString() @IsOptional() productId?: string;

  @IsString() @IsOptional() previewImageUrl?: string;
  @IsString() @IsOptional() previewDataUrl?: string;

  @IsObject() @IsOptional() designJson?: Record<string, unknown>;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EditableFieldBody)
  @IsOptional()
  editableFields?: EditableFieldBody[];

  @IsBoolean() @IsOptional() isFeatured?: boolean;
  @IsBoolean() @IsOptional() isPublished?: boolean;

  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
}
