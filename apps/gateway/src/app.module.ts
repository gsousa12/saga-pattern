import { Module } from '@nestjs/common';

import { CheckoutModule } from './modules/checkout/checkout.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersController } from './modules/orders/orders.controller';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [CheckoutModule, ProductsModule, NotificationsModule],
  controllers: [OrdersController],
})
export class AppModule {}
