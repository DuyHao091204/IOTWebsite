// src/sales/sales.controller.ts
import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private service: SalesService) {}

  // 0️⃣ Tạo bill mới
  @Post('create')
  async create() {
    return this.service.createReceipt();
  }

  // 1️⃣ Quét RFID thủ công (REST)
  @Post('scan')
  async scan(@Body() body: { uid: string }) {
    return this.service.scanRfid(body.uid);
  }

  // 2️⃣ Checkout toàn bộ bill từ client (REST)
  @Post('checkout')
  async checkout(@Body() body) {
    return this.service.checkout(body);
  }

  // 3️⃣ Lịch sử bill
  @Get()
  async history() {
    return this.service.history();
  }

  // 4️⃣ Chi tiết bill
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.service.detail(Number(id));
  }

  // 5️⃣ Thêm RFID vào bill (bán từng thẻ qua REST)
  @Post(':id/add-rfid')
  async addRfid(@Param('id') id: string, @Body() body: { uid: string }) {
    return this.service.addRfidToReceipt(Number(id), body.uid);
  }

  // 6️⃣ Cập nhật giảm giá
  @Post(':id/discount')
  async discount(@Param('id') id: string, @Body() body: { discount: number }) {
    return this.service.updateDiscount(Number(id), body.discount);
  }

  // 7️⃣ Hoàn tất bill (REST)
  @Post(':id/checkout')
  async checkoutReceipt(@Param('id') id: string) {
    return this.service.checkoutReceipt(Number(id));
  }

  // 8️⃣ ⭐ BẬT SELL MODE realtime (MQTT)
  @Post(':id/start-sell')
  async startSell(@Param('id') id: string) {
    return this.service.startSellMode(Number(id));
  }

  // 9️⃣ ⭐ TẮT SELL MODE realtime
  @Post('stop-sell')
  async stopSell() {
    return this.service.stopSellMode();
  }

  @Delete('cleanup/:id')
  async cleanup(@Param('id') id: string) {
    return this.service.cleanupDraftReceipt(Number(id));
  }
}
