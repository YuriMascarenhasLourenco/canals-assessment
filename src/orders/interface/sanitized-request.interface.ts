import { createOrder } from './create-order.interface';
import { sanitizedOrder } from './sanitized-order.interface';

export interface sanitizedRequest extends Omit<createOrder, 'items'> {
  items: sanitizedOrder[];
}
