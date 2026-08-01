import { Controller, Get, Post, Body } from '@nestjs/common';

class CreateOrderDto {
  productId!: string;
  quantity!: number;
  totalPrice!: number;
}

@Controller('orders')
export class OrdersController {
  @Get()
  findAll() {
    return { orders: [] };
  }

  @Post()
  create(@Body() body: CreateOrderDto) {
    return { message: 'Order creation queued', data: body };
  }
}
