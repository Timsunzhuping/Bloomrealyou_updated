import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  AI_PROMPT_MAX_LENGTH,
  PRODUCT_CATEGORIES,
  SUPPORTED_LOCALES,
  type Locale,
  type ProductCategory,
  type SloganTone,
} from '@custom-merch/shared';

const TONES: SloganTone[] = ['professional', 'playful', 'inspirational', 'bold', 'friendly'];

class PromptBaseBody {
  @IsString()
  @MinLength(2)
  @MaxLength(AI_PROMPT_MAX_LENGTH)
  prompt!: string;

  @IsIn([...SUPPORTED_LOCALES])
  @IsOptional()
  locale?: Locale;
}

export class GenerateSloganBody extends PromptBaseBody {
  @IsIn(TONES)
  @IsOptional()
  tone?: SloganTone;

  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  count?: number;
}

export class DesignIdeasBody extends PromptBaseBody {
  @IsArray()
  @IsIn([...PRODUCT_CATEGORIES], { each: true })
  @ArrayMaxSize(6)
  @IsOptional()
  preferredCategories?: ProductCategory[];
}

class PrintAreaBody {
  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;
}

export class DesignSuggestionsBody {
  @IsString()
  @MinLength(2)
  @MaxLength(AI_PROMPT_MAX_LENGTH)
  scene!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  productId?: string;

  @IsIn([...SUPPORTED_LOCALES])
  @IsOptional()
  locale?: Locale;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  style?: string;

  @IsObject()
  @IsOptional()
  printArea?: PrintAreaBody;
}

export class GenerateDesignImageBody {
  @IsString()
  @MinLength(2)
  @MaxLength(AI_PROMPT_MAX_LENGTH)
  prompt!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  productId?: string;

  @IsIn(['1024x1024', '2048x2048'])
  @IsOptional()
  size?: '1024x1024' | '2048x2048';

  @IsBoolean()
  @IsOptional()
  transparentBackground?: boolean;
}

export class CheckPrintabilityBody {
  @IsString()
  @MaxLength(4096)
  imageUrl!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  productId?: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  printMethod?: string;
}

export class GiftSetBody extends PromptBaseBody {
  @IsNumber()
  @IsOptional()
  budgetUsd?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  audienceSize?: number;
}

export class LogoLayoutBody extends PromptBaseBody {
  @IsString()
  @IsOptional()
  printArea?: string;
}

export class RemoveBackgroundBody {
  @IsString()
  @MaxLength(10_000_000)
  imageDataUrl!: string;
}

export class CheckRiskBody {
  @IsObject()
  designJson!: Record<string, unknown>;

  @IsString()
  @MaxLength(AI_PROMPT_MAX_LENGTH)
  @IsOptional()
  prompt?: string;
}
