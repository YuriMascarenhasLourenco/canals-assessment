import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AddressDto } from './address.dto';
import { OrderItemDto } from './order-item.dto';
import { PaymentInputDto } from './payment-input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { createOrder } from '../interface/create-order.interface';

export class CreateOrderDto implements createOrder {
  @ApiProperty({
    description: 'The ID of the customer placing the order',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'customerId must be a valid UUID' })
  customerId!: string;

  @ApiProperty({
    description: 'The address to which the order will be shipped',
    example: {
      line1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
    },
  })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress!: AddressDto;

  @ApiProperty({
    description: 'The items included in the order',
    type: [OrderItemDto],
  })
  @ArrayMinSize(1, { message: 'items must contain at least one item' })
  @ArrayUnique((item: OrderItemDto) => item.sku, {
    message: 'items must not contain duplicate sku entries',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    description: 'The payment information for the order',
    type: PaymentInputDto,
  })
  @ValidateNested()
  @Type(() => PaymentInputDto)
  payment!: PaymentInputDto;
}
