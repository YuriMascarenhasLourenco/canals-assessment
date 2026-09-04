import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { orderItem } from '../interface/order-item.interface';

export class OrderItemDto implements orderItem {
  @ApiProperty({
    description: 'The ID of the product being ordered',
    example: 'WIDGET-STD',
  })
  @IsString({ message: 'sku must be a valid string' })
  sku!: string;

  @ApiProperty({
    description: 'The quantity of the product being ordered',
    example: 1,
  })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be a positive integer' })
  quantity!: number;

  @ApiProperty({
    description: 'The price of the product being ordered in cents',
    example: 1999,
  })
  @IsInt({ message: 'priceCents must be an integer' })
  @Min(1, { message: 'priceCents must be a positive integer' })
  priceCents!: number;
}
