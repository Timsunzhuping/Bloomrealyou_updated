import { IsIn, IsOptional, IsString } from 'class-validator';

import type { PaymentProviderName } from '@custom-merch/shared';

export class CreatePaymentIntentBody {
  @IsString() orderId!: string;

  @IsIn(['stripe', 'paypal', 'manual_invoice'])
  @IsOptional()
  provider?: PaymentProviderName;
}
