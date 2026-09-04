import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class OrderPricingService {
  calculateTotal(items: CreateOrderDto['items']): number {
    try {
      return items.reduce((total, item) => {
        return total + item.priceCents * item.quantity;
      }, 0);
    } catch {
      throw new Error('Error calculating total order amount');
    }
  }
}
