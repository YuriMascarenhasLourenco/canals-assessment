import { Customer } from '@prisma/client';
import { LatLng } from 'src/geocoding/interfaces/lat-lng.interface';
import { WarehouseCandidate } from 'src/warehouses/interfaces/warehouse-candidate.interface';
import { sanitizedRequest } from './sanitized-request.interface';

export interface CreatePendingOrderInput {
  sanitizedInput: sanitizedRequest;
  customer: Customer;
  warehouse: WarehouseCandidate;
  shippingLocation: LatLng;
  totalAmountCents: number;
}
