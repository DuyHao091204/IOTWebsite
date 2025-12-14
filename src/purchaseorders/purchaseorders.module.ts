import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchaseorders.service';
import { PurchaseOrdersController } from './purchaseorders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
