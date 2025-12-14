import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RfidStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRfidDto } from './dto/create-rfid.dto';
import { RfidQueryDto } from './dto/query-rfid.dto';
import { UpdateRfidDto } from './dto/update-rfid.dto';

@Injectable()
export class RfidService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRfidDto) {
    const prod = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!prod) throw new NotFoundException('Product không tồn tại');

    try {
      return await this.prisma.rfid.create({
        data: {
          uid: dto.uid.trim(),
          productId: dto.productId,
          status: dto.status ?? RfidStatus.IN_STOCK,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('UID đã tồn tại');
      throw e;
    }
  }

  async findAll(query: RfidQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    const where: Prisma.RfidWhereInput = {
      ...(query.q ? { uid: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy = {
      [query.orderBy ?? 'uid']: query.orderDir ?? 'asc',
    } as Prisma.RfidOrderByWithRelationInput;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.rfid.count({ where }),
      this.prisma.rfid.findMany({
        where,
        include: { product: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findOne(uid: string) {
    const tag = await this.prisma.rfid.findUnique({
      where: { uid },
      include: { product: true },
    });
    if (!tag) throw new NotFoundException('RFID không tồn tại');
    return tag;
  }

  async update(uid: string, dto: UpdateRfidDto) {
    await this.findOne(uid);
    if (dto.productId) {
      const prod = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!prod) throw new NotFoundException('Product không tồn tại');
    }
    return this.prisma.rfid.update({
      where: { uid },
      data: {
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.lastSeenAt !== undefined
          ? { lastSeenAt: new Date(dto.lastSeenAt) }
          : {}),
      },
    });
  }

  // đổi trạng thái nhanh + ghi event tối thiểu
  async setStatus(uid: string, status: RfidStatus, note?: string) {
    await this.findOne(uid);

    const update = this.prisma.rfid.update({
      where: { uid },
      data: { status },
    });

    const createEvent = this.prisma.RFIDEvent.create({
      data: {
        rfidUid: uid,
        action: status === RfidStatus.IN_STOCK ? 'ACTIVATE' : 'DEACTIVATE',
      },
    });

    const [updated] = await this.prisma.$transaction([update, createEvent]);
    return updated;
  }

  async remove(uid: string) {
    await this.findOne(uid);
    return this.prisma.rfid.delete({ where: { uid } });
  }
}
