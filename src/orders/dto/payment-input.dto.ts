import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { paymentInput } from '../interface/payment-input.interface';

export class PaymentInputDto implements paymentInput {
  // Kept as a simple string of digits for this exercise. A real
  // integration would never pass a raw card number through our backend at
  // all -- see payment.service.ts for the caveat.
  @ApiProperty({
    description: 'The credit card number for the payment',
    example: '4111111111111111',
  })
  @Matches(/^\d{12,19}$/, {
    message: 'creditCardNumber must be 12-19 digits',
  })
  creditCardNumber!: string;
}
