import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { NotificationProvider } from '@custom-merch/shared';

import { NOTIFICATION_PROVIDER } from './notification.tokens';
import { MockNotificationProvider } from './providers/mock-notification.provider';

const log = new Logger('NotificationsModule');

/**
 * Active notification provider — gated on env. Future providers (SendGrid,
 * SES, Postmark) plug in the same way the shipping providers do; until then
 * the platform sends every notification through the mock so dev/CI works
 * without external services.
 */
const notificationProviderFactory: Provider<NotificationProvider> = {
  provide: NOTIFICATION_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): NotificationProvider => {
    const explicit = config.get<string>('NOTIFICATION_PROVIDER');
    if (explicit && explicit !== 'mock') {
      log.warn(`NOTIFICATION_PROVIDER=${explicit} not yet implemented — using mock`);
    } else {
      log.log('notification provider: mock');
    }
    return new MockNotificationProvider();
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [notificationProviderFactory],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
