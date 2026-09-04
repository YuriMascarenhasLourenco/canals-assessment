import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentModule } from 'src/payment/payment.module';
import { WarehousesModule } from 'src/warehouses/warehouse.module';
import { GeocodingModule } from 'src/geocoding/geocoding.module';
import { OrderValidationService } from './services/order-validation.service';
import { OrderPricingService } from './services/order-pricing.service';
import { OrderFulfillmentService } from './services/fulfillment.service';
import { OrderPersistenceService } from './services/persistence.service';

@Module({
  imports: [GeocodingModule, WarehousesModule, PaymentModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderValidationService,
    OrderPricingService,
    OrderFulfillmentService,
    OrderPersistenceService,
  ],
})
export class OrderModule {}
