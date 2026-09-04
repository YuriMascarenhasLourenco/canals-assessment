import { ChargeResult } from 'src/payment/payment.service';
import { sanitizedRequest } from './sanitized-request.interface';

export interface CompletePaidOrderInput {
  orderId: string;
  warehouseId: string;
  items: sanitizedRequest['items'];
  totalAmountCents: number;
  chargeResult: ChargeResult;
}
