import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePurchaseOrderDto } from './dto/create-purchaseorder.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchaseorder.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // 🧾 1️⃣ Tạo đơn nhập (chưa nhập kho)
  async create(dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'Phải có ít nhất 1 sản phẩm trong đơn nhập.',
      );
    }

    // ✅ Tổng tiền đơn nhập = tổng lineTotal
    const totalCost = dto.items.reduce((sum, i) => sum + i.lineTotal, 0);

    return this.prisma.$transaction(async (tx) => {
      // ✅ Tạo đơn nhập chính
      const po = await tx.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          createdById: dto.createdById,
          note: dto.note,
          totalCost: new Decimal(totalCost),
          status: 'pending',
        },
      });

      // ✅ Tạo các dòng chi tiết
      for (const item of dto.items) {
        if (!item.sku || item.sku.trim() === '') {
          throw new BadRequestException(
            'Thiếu SKU sản phẩm trong danh sách nhập.',
          );
        }
        if (!item.qty || !item.lineTotal) {
          throw new BadRequestException('Thiếu số lượng hoặc thành tiền.');
        }

        // 🔹 Tự tính đơn giá nhập (unit cost)
        const unitCost = item.lineTotal / item.qty;

        await tx.purchaseOrderItem.create({
          data: {
            poId: po.id,
            sku: item.sku.trim(),
            name: item.name ?? `Sản phẩm ${item.sku}`,
            qty: item.qty,
            unitCost: new Decimal(unitCost),
            lineTotal: new Decimal(item.lineTotal),
            sellPrice: new Decimal(0), // tạm = giá nhập
          },
        });
      }

      return po;
    });
  }

  // ✅ 2️⃣ Xác nhận nhập hàng
  async receiveOrder(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (po.status !== 'pending') {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ xác nhận.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of po.items) {
        const unitCost = Number(item.unitCost); // giá nhập / 1 SP
        const suggestedSellPrice = unitCost * 1.2; // giá bán đề xuất

        const existingProduct = await tx.product.findUnique({
          where: { sku: item.sku },
        });

        let productId: number;

        if (existingProduct) {
          // UPDATE sản phẩm có sẵn
          const updated = await tx.product.update({
            where: { sku: item.sku },
            data: {
              stock: { increment: item.qty },
              sellPrice: suggestedSellPrice, // ⭐ CẬP NHẬT GIÁ BÁN
              updatedAt: new Date(),
            },
          });

          productId = updated.id;
        } else {
          // TẠO mới sản phẩm
          const newProduct = await tx.product.create({
            data: {
              sku: item.sku,
              name: item.name ?? `Sản phẩm ${item.sku}`,
              stock: item.qty,
              sellPrice: suggestedSellPrice, // ⭐ SET GIÁ BÁN LÚC TẠO
            },
          });

          productId = newProduct.id;
        }

        // Gắn productId vào POItem
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { productId, sellPrice: suggestedSellPrice },
        });
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'received' },
      });
    });

    return { message: '✅ Đã xác nhận nhập kho và cập nhật tồn sản phẩm.' };
  }

  // 📜 3️⃣ Lấy tất cả đơn hàng
  async findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        createdBy: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔍 4️⃣ Lấy chi tiết 1 đơn hàng
  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: true,
        items: true,
      },
    });

    if (!po) throw new NotFoundException('Không tìm thấy đơn nhập hàng.');
    return po;
  }

  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Không tìm thấy đơn nhập hàng');

    // ✅ Tổng tiền đơn nhập = tổng lineTotal
    const totalCost = dto.items.reduce(
      (sum, i) => sum + Number(i.lineTotal || 0),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      // 🧱 Cập nhật phần header
      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: Number(dto.supplierId) || po.supplierId, // ép về int
          note: dto.note ?? po.note,
          totalCost: totalCost, // giữ kiểu số
        },
      });

      // 🧾 Xóa item cũ
      await tx.purchaseOrderItem.deleteMany({
        where: { poId: id },
      });

      // ➕ Ghi lại item mới
      await tx.purchaseOrderItem.createMany({
        data: dto.items.map((i) => ({
          poId: id,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          unitCost: i.qty > 0 ? i.lineTotal / i.qty : 0, // tính lại cho chắc
          lineTotal: i.lineTotal,
          sellPrice: (i.qty > 0 ? i.lineTotal / i.qty : 0) * 1.2,
        })),
      });

      return updatedPO;
    });
  }

  async remove(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Không tìm thấy đơn nhập hàng');

    if (po.status === 'received') {
      throw new BadRequestException('Không thể xóa đơn đã nhập kho.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
      return { message: 'Đã xóa đơn nhập hàng.' };
    });
  }

  // async getPendingRfid() {
  //   const pos = await this.prisma.purchaseOrder.findMany({
  //     where: {
  //       status: 'received', // chỉ đơn đã xác nhận nhập kho
  //     },
  //     include: {
  //       supplier: true,
  //       items: {
  //         include: {
  //           rfids: true,
  //         },
  //       },
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return pos.map((po) => ({
  //     id: po.id,
  //     code: `PO-${po.id}`,
  //     supplier: po.supplier.name,
  //     createdAt: po.createdAt.toISOString().split('T')[0],
  //     itemTotal: po.items.reduce((sum, i) => sum + i.qty, 0),
  //     rfidTotal: po.items.reduce((sum, i) => sum + i.rfids.length, 0),
  //   }));
  // }
}
