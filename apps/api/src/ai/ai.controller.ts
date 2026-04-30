import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';

import type {
  AiCheckRiskResult,
  AiDesignIdeasResult,
  AiGenerateSloganResult,
  AiGiftSetResult,
  AiLogoLayoutResult,
  AiRemoveBackgroundResult,
} from '@custom-merch/shared';

import {
  CheckRiskBody,
  DesignIdeasBody,
  GenerateSloganBody,
  GiftSetBody,
  LogoLayoutBody,
  RemoveBackgroundBody,
} from './ai.dto';
import { AIService } from './ai.service';

@Controller('ai')
export class AIController {
  constructor(private readonly service: AIService) {}

  /** POST /ai/generate-slogan */
  @Post('generate-slogan')
  @HttpCode(200)
  generateSlogan(
    @Body() body: GenerateSloganBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiGenerateSloganResult> {
    return this.service.generateSlogan(body, userId);
  }

  /** POST /ai/design-ideas */
  @Post('design-ideas')
  @HttpCode(200)
  designIdeas(
    @Body() body: DesignIdeasBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiDesignIdeasResult> {
    return this.service.designIdeas(body, userId);
  }

  /** POST /ai/gift-set-suggestions */
  @Post('gift-set-suggestions')
  @HttpCode(200)
  giftSet(
    @Body() body: GiftSetBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiGiftSetResult> {
    return this.service.giftSet(body, userId);
  }

  /** POST /ai/logo-layout */
  @Post('logo-layout')
  @HttpCode(200)
  logoLayout(
    @Body() body: LogoLayoutBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiLogoLayoutResult> {
    return this.service.logoLayout(body, userId);
  }

  /** POST /ai/remove-background */
  @Post('remove-background')
  @HttpCode(200)
  removeBackground(
    @Body() body: RemoveBackgroundBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiRemoveBackgroundResult> {
    return this.service.removeBackground(body, userId);
  }

  /** POST /ai/check-design-risk */
  @Post('check-design-risk')
  @HttpCode(200)
  checkRisk(
    @Body() body: CheckRiskBody,
    @Headers('x-cart-session') userId?: string,
  ): Promise<AiCheckRiskResult> {
    return this.service.checkRisk(body, userId);
  }
}
