import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

export interface ChargeRequest {
  cardNumber: string;
  amountCents: number;
  description: string;
}

export interface ChargeResult {
  success: boolean;
  externalPaymentId: string;
  cardLast4: string;
  failureReason?: string;
}

/**
 * Stand-in for a real payment gateway (e.g. Stripe, Braintree, Adyen). In
 * production this would be an HTTP call to the provider's charge/payment
 * intents endpoint, we'd never handle a raw PAN like this in our own
 * backend (we'd use their client-side tokenization instead), and we'd
 * persist only the token/last4/brand they hand back -- never the full
 * card number. We keep that last constraint here (see cardLast4 below)
 * even though the rest is simplified for the exercise.
 *
 * Mock behavior, loosely modeled on Stripe's classic test cards:
 *  - Card numbers ending in one of MOCK_PAYMENT_DECLINE_SUFFIXES (default
 *    "0002") are always declined.
 *  - Everything else succeeds.
 */
@Injectable()
export class PaymentService {
  private readonly declineSuffixes: string[];

  constructor(private readonly config: ConfigService) {
    this.declineSuffixes = (
      this.config.get<string>('MOCK_PAYMENT_DECLINE_SUFFIXES') ?? '0002'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async chargeCard(request: ChargeRequest): Promise<ChargeResult> {
    try {
      const { cardNumber, amountCents, description } = request;

      // Simulate real network latency to an external payment provider.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const digitsOnly = cardNumber.replace(/\D/g, '');
      const cardLast4 = digitsOnly.slice(-4);

      if (amountCents <= 0) {
        return {
          success: false,
          externalPaymentId: `pay_${crypto.randomUUID()}`,
          cardLast4,
          failureReason: 'Charge amount must be positive',
        };
      }

      const shouldDecline = this.declineSuffixes.some((suffix) =>
        digitsOnly.endsWith(suffix),
      );

      const externalPaymentId = `pay_${crypto.randomUUID()}`;

      if (shouldDecline) {
        return {
          success: false,
          externalPaymentId,
          cardLast4,
          failureReason: 'Card declined by issuer',
        };
      }

      void description;

      return {
        success: true,
        externalPaymentId,
        cardLast4,
      };
    } catch {
      throw new ServiceUnavailableException({
        message: 'Error charging card',
        request,
      });
    }
  }
}
