/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PurchaseOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ReceiptItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Supplier` table. All the data in the column will be lost.
  - Added the required column `name` to the `PurchaseOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellPrice` to the `PurchaseOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `PurchaseOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "PurchaseOrderItem" DROP COLUMN "createdAt",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "sellPrice" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "sku" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "ReceiptItem" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_sku_idx" ON "PurchaseOrderItem"("sku");

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
