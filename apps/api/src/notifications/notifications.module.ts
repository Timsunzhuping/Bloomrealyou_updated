import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { NotificationProvider } from '@custom-merch/shared';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { OrdersModule } from '../orders/orders.module';

import { AdminNotificationsController } from './notifications.controller';
import { NOTIFICATION_PROVIDER } from './notification.tokens';
import { OrderProgressService } from './order-progress.service';
import { MockNotificationProvider } from './providers/mock-notification.provider';
import { SendGridNotificationProvider } from './providers/sendgrid-notification.provider';
import { SesNotificationProvider } from './providers/ses-notification.provider';

const log = new Logger('NotificationsModule');

function parseTemplates(raw: string | undefined, label: string): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch (e) {
    log.warn(`${label} is not valid JSON (${(e as Error).message}); ignoring`);
    return {};
  }
}

/**
 * Active notification provider. Selection rules:
 *
 *   NOTIFICATION_PROVIDER=mock                                  → MockNotificationProvider
 *   NOTIFICATION_PROVIDER=sendgrid (or SENDGRID_API_KEY set)    → SendGridNotificationProvider
 *   NOTIFICATION_PROVIDER=ses      (or SES_ACCESS_KEY_ID set)   → SesNotificationProvider
 *
 * Each real provider falls back to mock when its credentials are missing so
 * a misconfigured deploy can never cause an unhandled exception during a
 * supplier QC upload — the QC itself is durable, the email isn't.
 */
const notificationProviderFactory: Provider<NotificationProvider> = {
  provide: NOTIFICATION_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): NotificationProvider => {
    const explicit = config.get<string>('NOTIFICATION_PROVIDER');
    const sendgridKey = config.get<string>('SENDGRID_API_KEY');
    const sesKey = config.get<string>('SES_ACCESS_KEY_ID');
    const provider =
      explicit ?? (sendgridKey ? 'sendgrid' : sesKey ? 'ses' : 'mock');

    if (provider === 'sendgrid' && sendgridKey) {
      log.log('notification provider: sendgrid');
      return new SendGridNotificationProvider(
        sendgridKey,
        config.get<string>('SENDGRID_FROM_EMAIL') ?? 'noreply@bloomrealyou.com',
        config.get<string>('SENDGRID_FROM_NAME') ?? 'Bloomrealyou',
        parseTemplates(config.get<string>('SENDGRID_TEMPLATES'), 'SENDGRID_TEMPLATES'),
      );
    }
    if (provider === 'ses' && sesKey) {
      const sesSecret = config.get<string>('SES_SECRET_ACCESS_KEY');
      const sesRegion = config.get<string>('SES_REGION') ?? 'us-east-1';
      if (!sesSecret) {
        log.warn('SES_SECRET_ACCESS_KEY missing — using mock');
      } else {
        log.log(`notification provider: ses (region=${sesRegion})`);
        return new SesNotificationProvider(
          sesKey,
          sesSecret,
          sesRegion,
          config.get<string>('SES_FROM_EMAIL') ?? 'noreply@bloomrealyou.com',
          parseTemplates(config.get<string>('SES_TEMPLATES'), 'SES_TEMPLATES'),
        );
      }
    }
    if (provider !== 'mock') {
      log.warn(`NOTIFICATION_PROVIDER=${provider} but credentials are missing — using mock`);
    } else {
      log.log('notification provider: mock');
    }
    return new MockNotificationProvider();
  },
};

@Global()
@Module({
  imports: [ConfigModule, OrdersModule, AdminAuthModule],
  controllers: [AdminNotificationsController],
  providers: [notificationProviderFactory, OrderProgressService],
  exports: [NOTIFICATION_PROVIDER, OrderProgressService],
})
export class NotificationsModule {}
