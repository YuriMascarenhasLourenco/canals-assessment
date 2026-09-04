import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentDeclinedException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        message,
        ...details,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
