import { OrderWithDetails } from '../interface/create-result.interface';

export function serializeOrder(order: OrderWithDetails) {
  return {
    id: order.id,
    status: order.status,
    customerId: order.customerId,
    warehouseId: order.warehouseId,
    shippingAddress: {
      line1: order.shippingLine1,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
      latitude: order.shippingLatitude,
      longitude: order.shippingLongitude,
    },
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      priceCents: item.priceCents,
    })),
    totalAmountCents: order.totalAmountCents,
    payment: order.payment
      ? {
          status: order.payment.status,
          externalPaymentId: order.payment.externalPaymentId,
          failureReason: order.payment.failureReason ?? undefined,
        }
      : null,
    createdAt: order.createdAt,
  };
}
