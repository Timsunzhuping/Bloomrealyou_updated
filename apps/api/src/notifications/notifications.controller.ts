import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import {
  SUPPORTED_LOCALES,
  type AdminUserDto,
  type Locale,
  type NotificationProvider,
  type NotificationResult,
} from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  NotificationLogRepository,
  type NotificationLogEntry,
  type NotificationLogStatus,
} from './notification-log.repository';
import { NOTIFICATION_PROVIDER } from './notification.tokens';
import { NOTIFICATION_TEMPLATES, renderTemplate, resolveTemplate } from './templates';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

class TestSendBody {
  @IsEmail()
  @MaxLength(320)
  to!: string;

  @IsString()
  @MaxLength(120)
  templateKey!: string;

  @IsIn([...SUPPORTED_LOCALES])
  @IsOptional()
  locale?: Locale;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

interface TemplatePreviewItem {
  key: string;
  locales: Locale[];
  /** First-line preview (subject) in `en` for the listing UI. */
  enSubject: string;
}

interface TestSendResult {
  /** Active provider name so the admin sees which back-end actually sent it. */
  providerName: string;
  result: NotificationResult;
  preview: { subject: string; text: string };
}

/**
 * Admin-only notification utilities.
 *
 *   GET  /admin/notifications/templates  — list every key + locales available
 *   POST /admin/notifications/test       — send a rendered template to an email
 *
 * Wrapped by the standard {@link AdminBearerGuard}; only `settings.write`
 * holders can hit either endpoint (admins, in our default RBAC).
 */
@Controller('admin/notifications')
@UseGuards(AdminBearerGuard)
export class AdminNotificationsController {
  constructor(
    @Inject(NOTIFICATION_PROVIDER) private readonly notifier: NotificationProvider,
    private readonly logs: NotificationLogRepository,
  ) {}

  @Get('templates')
  @RequirePermission('settings.read')
  list(): { items: TemplatePreviewItem[] } {
    const items: TemplatePreviewItem[] = Object.entries(NOTIFICATION_TEMPLATES).map(
      ([key, byLocale]) => ({
        key,
        locales: Object.keys(byLocale) as Locale[],
        enSubject: byLocale.en.subject,
      }),
    );
    return { items };
  }

  @Get('logs')
  @RequirePermission('settings.read')
  listLogs(
    @Query('status') status?: string,
    @Query('templateKey') templateKey?: string,
    @Query('orderId') orderId?: string,
    @Query('rfqId') rfqId?: string,
    @Query('quoteId') quoteId?: string,
    @Query('limit') limit?: string,
  ): { items: NotificationLogEntry[] } {
    const items = this.logs.list({
      status: status as NotificationLogStatus | undefined,
      templateKey,
      orderId,
      rfqId,
      quoteId,
      limit: limit ? Math.min(Number(limit) || 100, 500) : 100,
    });
    return { items };
  }

  @Post('test')
  @RequirePermission('settings.write')
  async testSend(
    @Body() body: TestSendBody,
    @Req() req: ReqWithAdmin,
  ): Promise<TestSendResult> {
    const me = req[ADMIN_USER_REQ_KEY];
    const tpl = resolveTemplate(body.templateKey, body.locale);
    const data = {
      providerName: this.notifier.name,
      locale: body.locale ?? 'en',
      sentAt: new Date().toISOString(),
      adminEmail: me?.email,
      ...(body.data ?? {}),
    };
    const rendered = tpl ? renderTemplate(tpl, data) : null;
    const result = await this.notifier.send({
      to: body.to,
      channel: 'email',
      templateKey: body.templateKey,
      locale: body.locale,
      data,
      subject: rendered?.subject,
    });
    return {
      providerName: this.notifier.name,
      result,
      preview: rendered ?? {
        subject: '(no template registered)',
        text: '(no template registered)',
      },
    };
  }
}
