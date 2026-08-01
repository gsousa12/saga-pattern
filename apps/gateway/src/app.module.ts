import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { OrdersController } from './orders/orders.controller';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [CheckoutModule],
  controllers: [ProductsController, OrdersController],
})
export class AppModule {}
