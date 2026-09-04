import { OmitType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';
import { SanitizedOrderDto } from './sanitized-order.dto';
import { sanitizedRequest } from '../interface/sanitized-request.interface';

export class SanitizedRequestDto
  extends OmitType(CreateOrderDto, ['items'] as const)
  implements sanitizedRequest
{
  items!: SanitizedOrderDto[];
}
