import { Controller, Get, Post, Body } from '@nestjs/common';
import type { CreateOrderBody } from '@orchestrator/schemas';

@Controller('orders')
export class OrdersController {
  @Get()
  findAll() {
    return { orders: [] };
  }

  @Post()
  create(@Body() body: CreateOrderBody) {
    return { message: 'Order creation queued', data: body };
  }
}
