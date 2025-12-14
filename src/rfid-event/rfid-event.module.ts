import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RfidEventController } from './rfid-event.controller';
import { RfidEventService } from './rfid-event.service';

@Module({
  imports: [PrismaModule],
  controllers: [RfidEventController],
  providers: [RfidEventService],
})
export class RfidEventModule {}
