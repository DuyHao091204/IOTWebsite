import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDecimal(v: number | string) {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) {
      throw new BadRequestException('Giá không hợp lệ');
    }
    return new Prisma.Decimal(v as any);
  }

  async createMany(dtos: CreateProductDto[]) {
    const data = dtos.map((d) => ({
      name: d.name.trim(),
      sku: d.sku.trim(),
      sellPrice: new Decimal(d.sellPrice),
    }));

    const skus = data.map((d) => d.sku);
    const existed = await this.prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    if (existed.length) {
      const dup = existed.map((e) => e.sku).join(', ');
      throw new ConflictException(`Các SKU đã tồn tại: ${dup}`);
    }

    const modelAny = this.prisma.product as any;
    if (typeof modelAny.createManyAndReturn === 'function') {
      return await modelAny.createManyAndReturn({
        data,
        select: {
          id: true,
          name: true,
          sku: true,
          sellPrice: true,
          createdAt: true,
        },
      });
    }

    // Fallback: transaction tạo từng bản ghi
    const created = await this.prisma.$transaction(
      data.map((item) =>
        this.prisma.product.create({
          data: item,
          select: {
            id: true,
            name: true,
            sku: true,
            sellPrice: true,
            createdAt: true,
          },
        }),
      ),
    );
    return created;
  }

  async findAll(query: ProductQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    const orderBy = query.orderBy ?? 'createdAt';
    const orderDir: 'asc' | 'desc' = query.orderDir ?? 'desc';

    const where: Prisma.ProductWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { sku: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { rfids: true },
      }),
    ]);

    const itemsWithCount = items.map((p) => ({
      ...p,
      rfidCount: p.rfids.length,
    }));

    return {
      total,
      page,
      pageSize,
      items: itemsWithCount,
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product không tồn tại');
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
          ...(dto.sellPrice !== undefined
            ? { sellPrice: this.toDecimal(dto.sellPrice) }
            : {}),
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('SKU đã tồn tại');
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    const [rFIDCount, receiptItemCount] = await this.prisma.$transaction([
      this.prisma.rfid.count({ where: { productId: id } }),
      this.prisma.receiptItem.count({ where: { productId: id } }),
    ]);
    if (rFIDCount)
      throw new ConflictException(`Không thể xoá: còn ${rFIDCount} thẻ rFID`);
    if (receiptItemCount)
      throw new ConflictException(
        `Không thể xoá: đã phát sinh ${receiptItemCount} dòng hoá đơn`,
      );
    return this.prisma.product.delete({ where: { id } });
  }
}
