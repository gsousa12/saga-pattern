import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

class CheckoutDto {
  idempotencyKey!: string;
  productId!: string;
  quantity!: number;
}

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async create(@Body() body: CheckoutDto) {
    return this.checkoutService.create(body);
  }
}
