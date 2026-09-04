import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RequestedItem } from './interfaces/requested-item.interface';
import { LatLng } from 'src/geocoding/interfaces/lat-lng.interface';
import { WarehouseCandidate } from './interfaces/warehouse-candidate.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { haversineDistanceKm } from 'src/common/geo.util';

@Injectable()
export class WarehouseSelectionService {
  constructor(private readonly prisma: PrismaService) {}

  async findClosestFulfillingWarehouse(
    items: RequestedItem[],
    shippingLocation: LatLng,
  ): Promise<WarehouseCandidate | null> {
    try {
      const warehouses = await this.prisma.warehouse.findMany();

      const fulfillingWarehouses: WarehouseCandidate[] = [];

      for (const warehouse of warehouses) {
        let canFulfillAll = true;

        for (const item of items) {
          const stock = await this.prisma.warehouseInventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: item.productId,
              },
            },
          });

          console.log(
            'stock for warehouse',
            warehouse.id,
            'and product',
            item.productId,
            ':',
            stock,
          );

          if (!stock || stock.quantity < item.quantity) {
            canFulfillAll = false;
            break;
          }
        }

        if (canFulfillAll) {
          fulfillingWarehouses.push({
            id: warehouse.id,
            name: warehouse.name,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            distanceKm: haversineDistanceKm(shippingLocation, warehouse),
          });
        }
      }

      if (fulfillingWarehouses.length === 0) {
        return null;
      }

      fulfillingWarehouses.sort((a, b) => a.distanceKm - b.distanceKm);

      return fulfillingWarehouses[0];
    } catch {
      throw new InternalServerErrorException(
        'Error finding closest fulfilling warehouse',
      );
    }
  }
}
