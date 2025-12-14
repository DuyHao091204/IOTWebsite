import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RfidEventService {
  constructor(private prisma: PrismaService) {}

  async history() {
    return this.prisma.rfidEvent.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        rfid: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
