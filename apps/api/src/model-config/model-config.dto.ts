import { MODEL_SCOPES } from '@custom-merch/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

import type { ModelKind, ModelScope, ModelVendor } from '@custom-merch/shared';

export class ModelRevisionBody {
  @IsInt() @Min(0) revision!: number;
}
export class ModelProfileBody extends ModelRevisionBody {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsIn(['doubao', 'openai-compatible', 'anthropic']) provider!: ModelVendor;
  @IsIn(['text', 'image']) kind!: ModelKind;
  @IsString() @MaxLength(200) baseUrl!: string;
  @IsString() @MinLength(1) @MaxLength(120) @Matches(/^[A-Za-z0-9._:/-]+$/) model!: string;
  @IsInt() @Min(5000) @Max(180000) timeoutMs!: number;
  @IsBoolean() enabled!: boolean;
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  @Matches(/^\S+$/)
  apiKey?: string;
  @ValidateIf((_o, value) => value !== undefined) @IsBoolean() removeKey?: boolean;
}
export class ModelBindingBody {
  @IsIn(MODEL_SCOPES) scope!: ModelScope;
  @IsIn(['environment', 'profile', 'disabled']) mode!: 'environment' | 'profile' | 'disabled';
  @IsOptional() @IsString() @MaxLength(80) profileId?: string | null;
}
export class ModelBindingsBody extends ModelRevisionBody {
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ModelBindingBody)
  bindings!: ModelBindingBody[];
}
