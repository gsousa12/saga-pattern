import { Module } from '@nestjs/common';

import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersController } from './modules/orders/orders.controller';
import { ProductsModule } from './modules/products/products.module';

@Module({ imports: [CheckoutModule, ProductsModule], controllers: [OrdersController] })
export class AppModule {}
