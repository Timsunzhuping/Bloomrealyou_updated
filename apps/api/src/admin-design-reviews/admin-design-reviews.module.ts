import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CustomizationsModule } from '../customizations/customizations.module';
import { OrdersModule } from '../orders/orders.module';

import { AdminDesignReviewsController } from './admin-design-reviews.controller';
import { AdminDesignReviewsService } from './admin-design-reviews.service';

@Module({
  imports: [AdminAuthModule, CustomizationsModule, OrdersModule],
  controllers: [AdminDesignReviewsController],
  providers: [AdminDesignReviewsService],
  exports: [AdminDesignReviewsService],
})
export class AdminDesignReviewsModule {}
