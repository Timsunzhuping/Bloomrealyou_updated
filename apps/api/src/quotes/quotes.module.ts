import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { RFQsModule } from '../rfqs/rfqs.module';

import { QuotesController } from './quotes.controller';
import { QuotesRepository } from './quotes.repository';
import { QuotesService } from './quotes.service';

@Module({
  imports: [RFQsModule, OrdersModule],
  controllers: [QuotesController],
  providers: [QuotesRepository, QuotesService],
  exports: [QuotesService, QuotesRepository],
})
export class QuotesModule {}
