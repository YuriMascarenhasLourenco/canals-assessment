import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { Address } from './interfaces/address.interface';
import { LatLng } from './interfaces/lat-lng.interface';

@Injectable()
export class GeocodingService {
  async geocodeAddress(address: Address): Promise<LatLng> {
    try {
      // Simulate real network latency of a 3rd party API.
      await new Promise((resolve) => setTimeout(resolve, 20));

      const normalized = [
        address.line1,
        address.city,
        address.state,
        address.postalCode,
        address.country,
      ]
        .join('|')
        .trim()
        .toLowerCase();

      const hash = crypto.createHash('sha256').update(normalized).digest();

      // Continental US bounding box, roughly.
      const LAT_MIN = 24.5;
      const LAT_MAX = 49.4;
      const LNG_MIN = -124.8;
      const LNG_MAX = -66.9;

      // Use two independent 4-byte chunks of the hash so lat/lng don't move
      // in lockstep.
      const latFraction = hash.readUInt32BE(0) / 0xffffffff;
      const lngFraction = hash.readUInt32BE(4) / 0xffffffff;

      const latitude = LAT_MIN + latFraction * (LAT_MAX - LAT_MIN);
      const longitude = LNG_MIN + lngFraction * (LNG_MAX - LNG_MIN);

      return {
        latitude: Math.round(latitude * 1e6) / 1e6,
        longitude: Math.round(longitude * 1e6) / 1e6,
      };
    } catch {
      throw new ServiceUnavailableException({
        message: 'Error geocoding address',
        address,
      });
    }
  }
}
