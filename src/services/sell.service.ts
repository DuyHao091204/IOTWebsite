// src/sales/sales.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { MqttService } from '../mqtt/mqtt.service';
import { RfidStatus } from '@prisma/client';

@Injectable()
export class SalesService implements OnModuleInit {
  private logger = new Logger(SalesService.name);

  // SELL MODE state
  private isSellMode = false;
  private currentReceiptId: number | null = null;

  constructor(
    private prisma: PrismaService,
    private mqtt: MqttService,
  ) {}

  // Đăng ký handler MQTT cho SELL MODE
  onModuleInit() {
    this.mqtt.registerSellHandler((uid) => this.handleSellUid(uid));
  }

  // =========================================================
  // SELL MODE – BẬT / TẮT
  // =========================================================
  startSellMode(receiptId: number) {
    this.isSellMode = true;
    this.currentReceiptId = receiptId;
    this.logger.log(`SELL MODE STARTED → receiptId=${receiptId}`);
    return { success: true };
  }

  stopSellMode() {
    this.isSellMode = false;
    this.currentReceiptId = null;
    this.logger.log('SELL MODE STOPPED');
    return { success: true };
  }

  // Gửi kết quả bán về frontend qua MQTT
  private sendSellResult(
    success: boolean,
    reason: string,
    uid: string,
    receiptId: number | null,
  ) {
    this.mqtt.publish(
      'rfid/sell/result',
      JSON.stringify({ success, reason, uid, receiptId }),
    );
  }

  // Xử lý UID từ ESP32 khi đang SELL MODE (topic rfid/sell)
  private async handleSellUid(uid: string) {
    if (!this.isSellMode || !this.currentReceiptId) return;

    const receiptId = this.currentReceiptId;
    let success = false;
    let reason = '';

    try {
      // 1. Tìm RFID
      const tag = await this.prisma.rfid.findUnique({
        where: { uid },
        include: { product: true },
      });

      if (!tag) {
        reason = 'Thẻ RFID không tồn tại';
        this.logger.warn(reason);
        return this.sendSellResult(false, reason, uid, receiptId);
      }

      if (!tag.productId || !tag.product) {
        reason = 'Thẻ chưa gắn sản phẩm';
        this.logger.warn(reason);
        return this.sendSellResult(false, reason, uid, receiptId);
      }

      if (tag.status === RfidStatus.SOLD || tag.receiptItemId) {
        reason = 'Thẻ này đã được bán rồi';
        this.logger.warn(reason);
        return this.sendSellResult(false, reason, uid, receiptId);
      }

      // 2. Kiểm tra sản phẩm đã có trong hóa đơn chưa
      let item = await this.prisma.receiptItem.findFirst({
        where: {
          receiptId,
          productId: tag.productId,
        },
      });

      if (!item) {
        // tạo mới
        item = await this.prisma.receiptItem.create({
          data: {
            receiptId,
            productId: tag.productId,
            qty: 1,
            unitPrice: new Decimal(tag.product.sellPrice),
            lineTotal: new Decimal(tag.product.sellPrice),
          },
        });
      } else {
        // tăng số lượng
        item = await this.prisma.receiptItem.update({
          where: { id: item.id },
          data: {
            qty: item.qty + 1,
            lineTotal: new Decimal((item.qty + 1) * Number(item.unitPrice)),
          },
        });
      }

      // 3. Gắn RFID vào ReceiptItem + set SOLD
      await this.prisma.rfid.update({
        where: { uid },
        data: {
          receiptItemId: item.id,
          status: RfidStatus.SOLD,
          lastSeenAt: new Date(),
        },
      });

      // 4. Cập nhật lại tổng hóa đơn
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: receiptId },
        include: { items: true },
      });

      if (receipt) {
        const subtotal = receipt.items.reduce(
          (s, it) => s + Number(it.lineTotal),
          0,
        );
        const totalQty = receipt.items.reduce((s, it) => s + it.qty, 0);
        const discountNumber = Number(receipt.discount || 0);

        await this.prisma.receipt.update({
          where: { id: receiptId },
          data: {
            totalQty,
            subtotal: new Decimal(subtotal),
            totalPrice: new Decimal(subtotal - discountNumber),
          },
        });
      }

      this.logger.log(
        `SELL MODE: Đã thêm UID=${uid} vào hóa đơn #${receiptId}`,
      );
      success = true;
    } catch (e) {
      this.logger.error(e);
      reason = 'Lỗi xử lý SELL UID';
    } finally {
      this.sendSellResult(success, reason, uid, this.currentReceiptId);
    }
  }

  // =========================================================
  // PHẦN CODE CŨ – GIỮ NGUYÊN (REST MODE)
  // =========================================================

  // 1️⃣ Quét RFID thủ công -> trả về sản phẩm
  async scanRfid(uid: string) {
    const tag = await this.prisma.rfid.findUnique({
      where: { uid },
      include: { product: true },
    });

    if (!tag) throw new BadRequestException('RFID không tồn tại.');
    if (!tag.productId)
      throw new BadRequestException('RFID chưa gắn sản phẩm.');

    return {
      productId: tag.productId,
      name: tag.product.name,
      price: tag.product.sellPrice,
      uid,
    };
  }

  // 2️⃣ Checkout full bill từ client (nếu bạn muốn build bill trên FE)
  async checkout(data: {
    userId: number;
    discount: number;
    items: {
      productId: number;
      qty: number;
      unitPrice: number;
      rfids: string[];
    }[];
  }) {
    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

    const totalPrice = subtotal - data.discount;

    return await this.prisma.$transaction(async (tx) => {
      // tạo Receipt
      const receipt = await tx.receipt.create({
        data: {
          userId: data.userId,
          totalQty: data.items.reduce((s, i) => s + i.qty, 0),
          subtotal: new Decimal(subtotal),
          discount: new Decimal(data.discount),
          totalPrice: new Decimal(totalPrice),
        },
      });

      // tạo ReceiptItem
      for (const item of data.items) {
        const ri = await tx.receiptItem.create({
          data: {
            receiptId: receipt.id,
            productId: item.productId,
            qty: item.qty,
            unitPrice: new Decimal(item.unitPrice),
            lineTotal: new Decimal(item.qty * item.unitPrice),
          },
        });

        // Gán RFID vào ReceiptItem + SOLD
        await tx.rfid.updateMany({
          where: { uid: { in: item.rfids } },
          data: {
            receiptItemId: ri.id,
            status: RfidStatus.SOLD,
            lastSeenAt: new Date(),
          },
        });
      }

      return receipt;
    });
  }

  async createReceipt() {
    const receipt = await this.prisma.receipt.create({
      data: {
        userId: 1, // TODO: lấy từ auth nếu có
        totalQty: 0,
        subtotal: new Decimal(0),
        discount: new Decimal(0),
        totalPrice: new Decimal(0),
      },
    });

    return { id: receipt.id };
  }

  // 3️⃣ Lịch sử bán hàng
  async history() {
    return this.prisma.receipt.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  // 4️⃣ Chi tiết 1 hóa đơn
  async detail(id: number) {
    return this.prisma.receipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            rfids: true,
          },
        },
      },
    });
  }

  // 5️⃣ Thêm RFID vào bill (bán từng thẻ qua REST)
  async addRfidToReceipt(receiptId: number, uid: string) {
    const tag = await this.prisma.rfid.findUnique({
      where: { uid },
      include: { product: true },
    });

    if (!tag) throw new BadRequestException('RFID không tồn tại.');
    if (!tag.productId)
      throw new BadRequestException('RFID chưa gắn sản phẩm.');

    let item = await this.prisma.receiptItem.findFirst({
      where: { receiptId, productId: tag.productId },
    });

    if (!item) {
      item = await this.prisma.receiptItem.create({
        data: {
          receiptId,
          productId: tag.productId,
          qty: 1,
          unitPrice: new Decimal(tag.product.sellPrice),
          lineTotal: new Decimal(tag.product.sellPrice),
        },
      });
    } else {
      item = await this.prisma.receiptItem.update({
        where: { id: item.id },
        data: {
          qty: item.qty + 1,
          lineTotal: new Decimal((item.qty + 1) * Number(item.unitPrice)),
        },
      });
    }

    await this.prisma.rfid.update({
      where: { uid },
      data: {
        receiptItemId: item.id,
        status: RfidStatus.SOLD,
        lastSeenAt: new Date(),
      },
    });

    return item;
  }

  async updateDiscount(id: number, discount: number) {
    const bill = await this.prisma.receipt.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!bill) throw new BadRequestException('Bill không tồn tại.');

    const subtotal = bill.items.reduce((s, it) => s + Number(it.lineTotal), 0);

    return this.prisma.receipt.update({
      where: { id },
      data: {
        subtotal: new Decimal(subtotal),
        discount: new Decimal(discount),
        totalPrice: new Decimal(subtotal - discount),
      },
    });
  }

  async checkoutReceipt(id: number) {
    return this.prisma.receipt.update({
      where: { id },
      data: { status: 'PAID' },
    });
  }
}
