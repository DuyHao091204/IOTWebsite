// src/services/detail.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DetailService {
  constructor(private prisma: PrismaService) {}

  async process(uid: string) {
    return this.prisma.rfid.findUnique({
      where: { uid },
      include: {
        product: true,
        poItem: {
          include: {
            po: true,
          },
        },
        receiptItem: {
          include: {
            receipt: true,
          },
        },
      },
    });
  }
}
