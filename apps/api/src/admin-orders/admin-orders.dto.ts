import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { ORDER_STATUSES, type OrderStatus } from '@custom-merch/shared';

export class AdminOrderStatusUpdateBody {
  @IsIn([...ORDER_STATUSES])
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  note?: string;

  @IsBoolean()
  @IsOptional()
  flagException?: boolean;
}

export class AdminOrderNoteBody {
  @IsString()
  @MaxLength(2000)
  body!: string;
}
