import { ChargeResult } from 'src/payment/payment.service';

export interface PaymentFailedInput {
  orderId: string;
  totalAmountCents: number;
  chargeResult: ChargeResult;
}
