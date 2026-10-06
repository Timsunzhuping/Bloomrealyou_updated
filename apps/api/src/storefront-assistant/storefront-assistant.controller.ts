import { BadRequestException, Body, Controller, Headers, Post, Req, Res } from '@nestjs/common';

import { AssistantChatBody } from './storefront-assistant.dto';
import { StorefrontAssistantService } from './storefront-assistant.service';

import type { Request, Response } from 'express';

@Controller('storefront-assistant')
export class StorefrontAssistantController {
  constructor(private readonly service: StorefrontAssistantService) {}
  @Post('chat')
  async chat(
    @Body() body: AssistantChatBody,
    @Headers('x-cart-session') session: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (
      !session ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(session)
    )
      throw new BadRequestException({
        code: 'ASSISTANT_SESSION_REQUIRED',
        message: 'Open a shopping session first.',
      });
    res.setHeader('Cache-Control', 'no-store');
    // Never trust a client-supplied forwarded address for the extra model-call limit.
    return this.service.chat(session, req.socket.remoteAddress ?? 'unknown', body);
  }
}
