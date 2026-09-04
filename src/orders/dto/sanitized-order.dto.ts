import { IsString } from 'class-validator';
import { OrderItemDto } from './order-item.dto';
import { sanitizedOrder } from '../interface/sanitized-order.interface';

export class SanitizedOrderDto extends OrderItemDto implements sanitizedOrder {
  @IsString()
  productId!: string;
}
