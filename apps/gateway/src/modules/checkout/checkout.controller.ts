import { Controller, Post, Body } from '@nestjs/common';
import type { CheckoutBody } from '@orchestrator/schemas';

// oxlint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async create(@Body() body: CheckoutBody) {
    return this.checkoutService.create(body);
  }
}
