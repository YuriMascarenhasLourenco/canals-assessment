import { NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';
import { plainToInstance } from 'class-transformer';
import { isUUID } from 'class-validator';
import { SanitizedRequestDto } from '../dto/sanitized-request.dto';

export const sanitizeRequest = (
  input: CreateOrderDto,
  productBySku: Map<string, { id: string }>,
): SanitizedRequestDto => {
  const items = input.items.map((item) => {
    const product = productBySku.get(item.sku);

    if (!product) {
      throw new NotFoundException(`Product not found: ${item.sku}`);
    } else if (!isUUID(product.id)) {
      throw new NotFoundException(`Invalid productId for SKU: ${item.sku}`);
    }
    console.log('typeof product.id:', typeof product.id);
    return {
      ...item,
      productId: product.id,
    };
  });

  return plainToInstance(SanitizedRequestDto, {
    ...input,
    items,
  });
};
