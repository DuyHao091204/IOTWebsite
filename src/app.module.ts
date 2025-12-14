import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RfidModule } from './rfid/rfid.module';
import { PurchaseOrdersModule } from './purchaseorders/purchaseorders.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuthModule } from './auth/auth.module';
import { ScanRfidModule } from './scanrfid/scanrfid.module';
import { SalesModule } from './sales/sales.module';
import { MqttModule } from './mqtt/mqtt.module';
import { RfidEventModule } from './rfid-event/rfid-event.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    DashboardModule,
    ProductsModule,
    RfidModule,
    ScanRfidModule,
    PurchaseOrdersModule,
    UsersModule,
    SuppliersModule,
    AuthModule,
    RfidEventModule,
    SalesModule,
    MqttModule,
  ],
})
export class AppModule {}
