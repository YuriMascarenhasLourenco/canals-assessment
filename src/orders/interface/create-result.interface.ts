import { Order } from '@prisma/client';

export interface CreateOrderResult {
  order: OrderWithDetails;
  paymentDeclined: boolean;
}
export type OrderWithDetails = Order & {
  items: {
    productId: string;
    quantity: number;
    priceCents: number;
  }[];
  payment: {
    status: string;
    externalPaymentId: string;
    failureReason: string | null;
  } | null;
};
