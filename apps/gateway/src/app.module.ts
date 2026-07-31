import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { OrdersController } from './orders/orders.controller';

@Module({
  imports: [],
  controllers: [ProductsController, OrdersController],
})
export class AppModule {}
