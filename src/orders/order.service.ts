import { Injectable } from '@nestjs/common';
import { PaymentService } from 'src/payment/payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResult } from './interface/create-result.interface';
import { OrderFulfillmentService } from './services/fulfillment.service';
import { OrderPersistenceService } from './services/persistence.service';
import { OrderValidationService } from './services/order-validation.service';
import { OrderPricingService } from './services/order-pricing.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly validation: OrderValidationService,
    private readonly pricing: OrderPricingService,
    private readonly fulfillment: OrderFulfillmentService,
    private readonly persistence: OrderPersistenceService,
    private readonly payment: PaymentService,
  ) {}

  async createOrder(input: CreateOrderDto): Promise<CreateOrderResult> {
    const { customer, sanitizedInput } = await this.validation.validate(input);

    const totalAmountCents = this.pricing.calculateTotal(sanitizedInput.items);

    const { warehouse, shippingLocation } =
      await this.fulfillment.findWarehouse(sanitizedInput);

    const pendingOrder = await this.persistence.createPendingOrder({
      sanitizedInput,
      customer,
      warehouse,
      shippingLocation,
      totalAmountCents,
    });

    const chargeResult = await this.payment.chargeCard({
      cardNumber: input.payment.creditCardNumber,
      amountCents: totalAmountCents,
      description: `Order ${pendingOrder.id}`,
    });

    if (!chargeResult.success) {
      return await this.persistence.markPaymentFailed({
        orderId: pendingOrder.id,
        totalAmountCents,
        chargeResult,
      });
    }

    return await this.persistence.completePaidOrder({
      orderId: pendingOrder.id,
      warehouseId: warehouse.id,
      items: sanitizedInput.items,
      totalAmountCents,
      chargeResult,
    });
  }
}
