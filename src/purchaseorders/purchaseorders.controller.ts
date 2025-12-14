import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchaseorders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchaseorder.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchaseorder.dto';

@Controller('purchaseorders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Post()
  async create(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Put(':id/receive')
  async confirm(@Param('id', ParseIntPipe) id: number) {
    return this.service.receiveOrder(id);
  }

  // ✅ Thêm xóa đơn nhập
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // @Get('pending-rfid')
  // async pendingRfid() {
  //   return this.service.getPendingRfid();
  // }
}
