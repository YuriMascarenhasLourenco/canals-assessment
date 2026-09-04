import { orderItem } from './order-item.interface';

export interface sanitizedOrder extends orderItem {
  productId: string;
}
