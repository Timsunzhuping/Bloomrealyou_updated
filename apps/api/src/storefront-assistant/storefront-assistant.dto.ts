import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import type {
  StorefrontAssistantInput,
  StorefrontAssistantMode,
  StorefrontAssistantHistory,
  Locale,
} from '@custom-merch/shared';

export class AssistantHistoryBody implements StorefrontAssistantHistory {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() @MaxLength(2400) content!: string;
}
export class AssistantChatBody implements StorefrontAssistantInput {
  @IsString() @MinLength(1) @MaxLength(1800) @Matches(/\S/) message!: string;
  @IsIn(['en', 'zh-CN', 'es', 'ar']) locale!: Locale;
  @IsIn(['shop', 'design', 'support']) mode!: StorefrontAssistantMode;
  @IsOptional() @IsString() @MaxLength(120) @Matches(/^[a-zA-Z0-9_-]+$/) productSlug?: string;
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AssistantHistoryBody)
  history!: AssistantHistoryBody[];
}
