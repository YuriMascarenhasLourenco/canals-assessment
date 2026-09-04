import { address } from './address.interface';
import { orderItem } from './order-item.interface';
import { paymentInput } from './payment-input.interface';

export interface createOrder {
  customerId: string;
  shippingAddress: address;
  items: orderItem[];
  payment: paymentInput;
}
