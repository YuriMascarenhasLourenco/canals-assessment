import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentDeclinedException } from 'src/common/exceptions';
import { serializeOrder } from './helpers/serialize-order.helper';
import { ApiBody } from '@nestjs/swagger';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBody({
    type: CreateOrderDto,
    description:
      'The order details including customer, shipping address, items, and payment information',
    required: true,
    examples: {
      example1: {
        summary: 'Example Order',
        value: {
          customerId: '550e8400-e29b-41d4-a716-446655440000',
          shippingAddress: {
            line1: '123 Main St',
            city: 'Miami',
            state: 'FL',
            postalCode: '12345',
            country: 'US',
          },
          items: [
            {
              sku: 'WIDGET-STD',
              quantity: 1,
              priceCents: 1999,
            },
          ],
          payment: {
            creditCardNumber: '1234567892456',
          },
        },
      },
    },
  })
  @Post('order')
  async create(@Body() dto: CreateOrderDto) {
    const { order, paymentDeclined } = await this.orderService.createOrder(dto);

    if (paymentDeclined) {
      // Order was created for audit purposes, but payment failed, so we
      // surface that as a 402 while still returning the order resource
      // (with status PAYMENT_FAILED) so the client can show/retry it.
      throw new PaymentDeclinedException(
        order.payment?.failureReason ?? 'Payment was declined',
        { order: serializeOrder(order) },
      );
    }

    return serializeOrder(order);
  }
}
