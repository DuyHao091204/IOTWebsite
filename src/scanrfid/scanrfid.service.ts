// src/scanrfid/scanrfid.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from '../mqtt/mqtt.service';
import { RfidStatus } from '@prisma/client';

@Injectable()
export class ScanRfidService implements OnModuleInit {
  private logger = new Logger(ScanRfidService.name);

  private isStoreMode = false;
  private currentPoId: number | null = null;
  private currentItemId: number | null = null;

  constructor(
    private prisma: PrismaService,
    private mqtt: MqttService,
  ) {}

  onModuleInit() {
    this.mqtt.registerStoreHandler((uid) => this.handleUid(uid));
  }

  // ---------- LIST PO ----------
  async getPoList() {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { status: 'received' },
      include: {
        supplier: true,
        items: { include: { rfids: true } },
      },
      orderBy: { id: 'desc' },
    });

    return pos.map((po) => ({
      id: po.id,
      supplier: { name: po.supplier?.name || 'N/A' },
      createdAt: po.createdAt,
      items: po.items.map((i) => ({
        qty: i.qty,
        rfids: i.rfids,
      })),
    }));
  }

  // ---------- CHI TIẾT PO ----------
  async getPoDetail(poId: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        supplier: true,
        items: {
          include: { product: true, rfids: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!po) throw new Error('PO không tồn tại');

    return {
      id: po.id,
      supplier: po.supplier.name,
      createdAt: po.createdAt,
      items: po.items.map((i) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        qty: i.qty,
        scanned: i.rfids.length,
        productId: i.productId!,
      })),
    };
  }

  // ---------- START / STOP ----------
  async startStoreMode(poId: number, itemId: number) {
    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.poId !== poId) {
      this.logger.warn('PO hoặc Item không hợp lệ');
      throw new Error('PO hoặc Item không hợp lệ');
    }

    this.currentPoId = poId;
    this.currentItemId = itemId;
    this.isStoreMode = true;

    this.logger.log(`STORE MODE STARTED → poId=${poId}, itemId=${itemId}`);

    this.mqtt.publish('mode', 'store');
    return { success: true };
  }

  stopStoreMode() {
    this.logger.log('STORE MODE STOPPED');
    this.isStoreMode = false;
    this.currentPoId = null;
    this.currentItemId = null;

    this.mqtt.publish('mode', 'off');
    return { success: true };
  }

  // ---------- HANDLE UID ----------
  private async handleUid(uid: string) {
    if (!this.isStoreMode || !this.currentItemId || !this.currentPoId) return;

    const poId = this.currentPoId;
    const itemId = this.currentItemId;

    this.logger.log(
      `STORE MODE: nhận UID=${uid} cho po=${poId}, item=${itemId}`,
    );

    let success = false;
    let reason = '';

    try {
      // 1) Lấy item
      const item = await this.prisma.purchaseOrderItem.findUnique({
        where: { id: itemId },
        include: { product: true },
      });

      if (!item) {
        reason = 'PO Item không tồn tại';
        this.logger.error(reason);
        return;
      }

      // 2) UID đã tồn tại → từ chối
      const exist = await this.prisma.rfid.findUnique({ where: { uid } });
      if (exist) {
        reason = 'UID đã được sử dụng';
        this.logger.warn(reason);

        this.mqtt.publish(
          'rfid/store/result',
          JSON.stringify({ success: false, reason, uid }),
        );
        return;
      }

      // 3) TẠO THẺ MỚI
      await this.prisma.rfid.create({
        data: {
          uid,
          productId: item.productId!,
          poItemId: item.id,
          status: RfidStatus.IN_STOCK,
          lastSeenAt: new Date(),
        },
      });

      await this.prisma.rfidEvent.create({
        data: {
          rfidUid: uid,
          action: `STORE_PO_${poId}`,
        },
      });

      this.logger.log(`ĐÃ TẠO RFID MỚI & LƯU ${uid} vào POItem #${item.id}`);
      success = true;

      // 4) ĐẾM LẠI SAU KHI TẠO → QUAN TRỌNG
      const newCount = await this.prisma.rfid.count({
        where: { poItemId: item.id },
      });

      // Nếu đủ SL thì tự động dừng
      if (newCount >= item.qty) {
        this.logger.log(
          `==> ITEM #${item.id} đã hoàn thành (${newCount}/${item.qty}). TỰ DỪNG STORE MODE.`,
        );

        this.stopStoreMode();

        this.mqtt.publish(
          'rfid/store/result',
          JSON.stringify({
            success: true,
            finished: true,
            uid,
            poId,
            itemId,
          }),
        );

        return;
      }
    } catch (e) {
      reason = 'Lỗi xử lý UID';
      this.logger.error(e);
    }

    // Gửi phản hồi chung
    this.mqtt.publish(
      'rfid/store/result',
      JSON.stringify({ success, reason, uid, poId, itemId }),
    );
  }
}
