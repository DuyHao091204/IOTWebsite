import { Module } from '@nestjs/common';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RfidController],
  providers: [RfidService],
})
export class RfidModule {}
