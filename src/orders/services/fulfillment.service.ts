import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { GeocodingService } from 'src/geocoding/geocoding.service';
import { WarehouseSelectionService } from 'src/warehouses/warehouse.service';
import { UUID } from 'crypto';
import { SanitizedRequestDto } from '../dto/sanitized-request.dto';

@Injectable()
export class OrderFulfillmentService {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly warehouseSelection: WarehouseSelectionService,
  ) {}

  async findWarehouse(input: SanitizedRequestDto) {
    try {
      const shippingLocation = await this.geocoding.geocodeAddress(
        input.shippingAddress,
      );
      const warehouse =
        await this.warehouseSelection.findClosestFulfillingWarehouse(
          input.items.map((item) => ({
            quantity: item.quantity,
            productId: item.productId as UUID,
          })),
          shippingLocation,
        );

      if (!warehouse) {
        throw new UnprocessableEntityException({
          message:
            'No single warehouse has sufficient stock to fulfill this order',
          items: input.items,
        });
      }

      return {
        warehouse,
        shippingLocation,
      };
    } catch {
      throw new UnprocessableEntityException({
        message: 'Error finding warehouse for this order',
        items: input.items,
      });
    }
  }
}
