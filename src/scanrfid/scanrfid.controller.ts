// src/scanrfid/scanrfid.controller.ts
import { Controller, Post, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ScanRfidService } from './scanrfid.service';

@Controller('scanrfid')
export class ScanRfidController {
  constructor(private readonly service: ScanRfidService) {}

  // LIST PO chờ quét (trang /scanrfid)
  @Get()
  async listPo() {
    return this.service.getPoList();
  }

  // Chi tiết 1 PO (trang /scanrfid/:poId)
  @Get(':poId')
  async getPo(@Param('poId', ParseIntPipe) poId: number) {
    return this.service.getPoDetail(poId);
  }

  // === FE gọi khi bấm nút "Quét RFID" trong 1 dòng item ===
  // POST /scanrfid/:poId/start/:itemId
  @Post(':poId/start/:itemId')
  async start(
    @Param('poId', ParseIntPipe) poId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.startStoreMode(poId, itemId);
  }

  // === FE gọi khi bấm "Dừng" ===
  // POST /scanrfid/:poId/stop
  @Post(':poId/stop')
  async stop(@Param('poId', ParseIntPipe) _poId: number) {
    return this.service.stopStoreMode();
  }
}
