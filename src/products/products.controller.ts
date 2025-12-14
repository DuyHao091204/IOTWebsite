import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
  ParseArrayPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsPipe } from './pipe/products.pipe';

@Controller('products')
export class ProductsController {
  ProductsService: any;
  constructor(private readonly service: ProductsService) {}

  @Post()
  @UsePipes(
    new ProductsPipe<CreateProductDto>('CreateProductDto'),
    new ParseArrayPipe({ items: CreateProductDto }),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createMany(@Body() dtos: CreateProductDto[]) {
    const items = await this.service.createMany(dtos);
    return { count: items.length, items };
  }

  @Get()
  findAll(@Query() q: ProductQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
