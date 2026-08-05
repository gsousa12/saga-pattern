import { Controller, Get } from '@nestjs/common';

// oxlint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return { products };
  }
}
