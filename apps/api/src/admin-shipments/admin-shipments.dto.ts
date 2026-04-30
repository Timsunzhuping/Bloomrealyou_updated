import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  SHIPMENT_STATUSES,
  SUPPORTED_CURRENCIES,
  type Currency,
  type ShipmentStatus,
} from '@custom-merch/shared';

const SHIPPING_METHODS = ['standard', 'express', 'rush'] as const;
type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export class CreateShipmentBody {
  @IsString() orderId!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  productionJobIds?: string[];

  @IsString() @IsOptional() @MaxLength(120) carrier?: string;
  @IsString() @IsOptional() @MaxLength(120) trackingNumber?: string;
  @IsString() @IsOptional() @MaxLength(2000) trackingUrl?: string;

  @IsIn([...SHIPPING_METHODS]) @IsOptional() shippingMethod?: ShippingMethod;

  @IsInt() @Min(0) @IsOptional() shippingCostMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;

  @IsISO8601() @IsOptional() estimatedDeliveryAt?: string;
  @IsInt() @Min(0) @IsOptional() packageWeightGrams?: number;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string;

  @IsIn([...SHIPMENT_STATUSES]) @IsOptional() status?: ShipmentStatus;
}

export class UpdateShipmentBody {
  @IsString() @IsOptional() @MaxLength(120) carrier?: string | null;
  @IsString() @IsOptional() @MaxLength(120) trackingNumber?: string | null;
  @IsString() @IsOptional() @MaxLength(2000) trackingUrl?: string | null;
  @IsIn([...SHIPPING_METHODS]) @IsOptional() shippingMethod?: ShippingMethod;
  @IsInt() @Min(0) @IsOptional() shippingCostMinor?: number;
  @IsIn([...SUPPORTED_CURRENCIES]) @IsOptional() currency?: Currency;
  @IsISO8601() @IsOptional() estimatedDeliveryAt?: string | null;
  @IsISO8601() @IsOptional() shippedAt?: string | null;
  @IsISO8601() @IsOptional() deliveredAt?: string | null;
  @IsInt() @Min(0) @IsOptional() packageWeightGrams?: number | null;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string | null;
  @IsIn([...SHIPMENT_STATUSES]) @IsOptional() status?: ShipmentStatus;
}
