import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import type { PricingResult } from '@custom-merch/shared';

import { CalculatePricingBody } from './pricing.dto';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  /** POST /pricing/calculate */
  @Post('calculate')
  @HttpCode(200)
  calculate(@Body() body: CalculatePricingBody): PricingResult {
    return this.service.calculate(body);
  }
}
