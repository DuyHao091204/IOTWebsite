import { Module } from '@nestjs/common';
import { ScanRfidService } from './scanrfid.service';
import { ScanRfidController } from './scanrfid.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [MqttModule],
  controllers: [ScanRfidController],
  providers: [ScanRfidService, PrismaService],
})
export class ScanRfidModule {}
