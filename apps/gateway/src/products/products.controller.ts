import { Controller, Get, Post, Body } from '@nestjs/common';

class CreateProductDto {
  name!: string;
  price!: number;
  description?: string;
}

@Controller('products')
export class ProductsController {
  @Get()
  findAll() {
    return { products: [] };
  }

  @Post()
  create(@Body() body: CreateProductDto) {
    return { message: 'Product creation queued', data: body };
  }
}
