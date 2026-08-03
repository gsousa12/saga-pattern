import { Controller, Get, Post, Body } from '@nestjs/common';
import type { CreateProductBody } from '@orchestrator/schemas';

@Controller('products')
export class ProductsController {
  @Get()
  findAll() {
    return { products: [] };
  }

  @Post()
  create(@Body() body: CreateProductBody) {
    return { message: 'Product creation queued', data: body };
  }
}
