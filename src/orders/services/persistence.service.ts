import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderResult } from '../interface/create-result.interface';
import { CreatePendingOrderInput } from '../interface/pending-order.interface';
import { PaymentFailedInput } from '../interface/payment-failed.interface';
import { CompletePaidOrderInput } from '../interface/complete-order.interface';

@Injectable()
export class OrderPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createPendingOrder({
    sanitizedInput,
    customer,
    warehouse,
    shippingLocation,
    totalAmountCents,
  }: CreatePendingOrderInput) {
    try {
      const order = await this.prisma.order.create({
        data: {
          customerId: customer.id,
          warehouseId: warehouse.id,
          shippingLine1: sanitizedInput.shippingAddress.line1,
          shippingCity: sanitizedInput.shippingAddress.city,
          shippingState: sanitizedInput.shippingAddress.state,
          shippingPostalCode: sanitizedInput.shippingAddress.postalCode,
          shippingCountry: sanitizedInput.shippingAddress.country,
          shippingLatitude: shippingLocation.latitude,
          shippingLongitude: shippingLocation.longitude,
          status: OrderStatus.PENDING,
          totalAmountCents,
        },
      });
      await this.prisma.orderItem.createMany({
        data: sanitizedInput.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceCents: item.priceCents,
        })),
      });

      return order;
    } catch {
      throw new ServiceUnavailableException('Error creating pending order');
    }
  }

  async markPaymentFailed({
    orderId,
    totalAmountCents,
    chargeResult,
  }: PaymentFailedInput): Promise<CreateOrderResult> {
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            orderId,
            amountCents: totalAmountCents,
            status: 'FAILED',
            externalPaymentId: chargeResult.externalPaymentId,
            cardLast4: chargeResult.cardLast4,
            failureReason: chargeResult.failureReason ?? 'Payment declined',
          },
        });

        return await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            status: OrderStatus.PAYMENT_FAILED,
          },
          include: {
            items: true,
            payment: true,
          },
        });
      });

      return {
        order,
        paymentDeclined: true,
      };
    } catch {
      throw new ServiceUnavailableException('Error marking payment as failed');
    }
  }

  async completePaidOrder({
    orderId,
    warehouseId,
    items,
    totalAmountCents,
    chargeResult,
  }: CompletePaidOrderInput): Promise<CreateOrderResult> {
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.warehouseInventory.update({
            where: {
              warehouseId_productId: {
                warehouseId,
                productId: item.productId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        await tx.payment.create({
          data: {
            orderId,
            amountCents: totalAmountCents,
            status: 'SUCCEEDED',
            externalPaymentId: chargeResult.externalPaymentId,
            cardLast4: chargeResult.cardLast4,
          },
        });

        return await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            status: OrderStatus.PAID,
          },
          include: {
            items: true,
            payment: true,
          },
        });
      });

      return {
        order,
        paymentDeclined: false,
      };
    } catch {
      throw new ServiceUnavailableException('Error completing paid order');
    }
  }
}
