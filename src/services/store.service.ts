// src/services/store.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RfidStatus } from '@prisma/client';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(private prisma: PrismaService) {}

  async process(uid: string) {
    this.logger.log(`Storing RFID: ${uid}`);

    // 1. Check trùng UID
    const existed = await this.prisma.rfid.findUnique({ where: { uid } });
    if (existed) {
      this.logger.warn(
        `RFID ${uid} already exists with status=${existed.status}`,
      );
      return existed;
    }

    // 2. Lấy POItem mới nhất (bạn có thể thay logic này tuỳ flow nhập kho)
    const poItem = await this.prisma.purchaseOrderItem.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!poItem) {
      this.logger.warn('No PurchaseOrderItem found to attach RFID');
      return null;
    }

    // 3. Đảm bảo có Product để gán cho RFID
    let productId: number;
    if (poItem.productId) {
      productId = poItem.productId;
    } else {
      // Nếu sản phẩm chưa tồn tại trong bảng Product -> tạo từ thông tin POItem
      const product = await this.prisma.product.upsert({
        where: { sku: poItem.sku },
        update: {
          name: poItem.name,
          sellPrice: poItem.sellPrice,
        },
        create: {
          sku: poItem.sku,
          name: poItem.name,
          sellPrice: poItem.sellPrice,
          stock: 0,
        },
      });
      productId = product.id;
    }

    // 4. Tạo RFID
    const rfid = await this.prisma.rfid.create({
      data: {
        uid,
        productId,
        poItemId: poItem.id,
        status: RfidStatus.IN_STOCK,
      },
    });

    // 5. Ghi event
    await this.prisma.rfidEvent.create({
      data: {
        rfidUid: uid,
        action: 'STORE_SCAN',
      },
    });

    this.logger.log(
      `Stored RFID ${uid} for POItem #${poItem.id}, productId=${productId}`,
    );
    return rfid;
  }
}
