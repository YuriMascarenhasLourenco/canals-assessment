import { Module } from '@nestjs/common';
import { WarehouseSelectionService } from './warehouse.service';

@Module({
  providers: [WarehouseSelectionService],
  exports: [WarehouseSelectionService],
})
export class WarehousesModule {}
