import { Module } from '@nestjs/common';

import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersController } from './modules/orders/orders.controller';
import { ProductsController } from './modules/products/products.controller';

@Module({ imports: [CheckoutModule], controllers: [ProductsController, OrdersController] })
export class AppModule {}
