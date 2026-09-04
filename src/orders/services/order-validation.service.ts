import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { sanitizeRequest } from '../helpers/sanitize-request.helper';

@Injectable()
export class OrderValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(input: CreateOrderDto) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${input.customerId} not found`);
      }

      const skus = input.items.map((item) => item.sku);

      const products = await this.prisma.product.findMany({
        where: { sku: { in: skus } },
      });
      console.log('products:', products);
      const productBySku = new Map(
        products.map((product) => [product.sku, product]),
      );

      const missingSkus = skus.filter((sku) => !productBySku.has(sku));

      if (missingSkus.length > 0) {
        throw new NotFoundException(
          `Product(s) not found: ${missingSkus.join(', ')}`,
        );
      }
      const sanitizedInput = sanitizeRequest(input, productBySku);

      return { customer, sanitizedInput };
    } catch {
      throw new NotFoundException(`Error validating order input`);
    }
  }
}
