-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopId_clientId_key" ON "Customer"("shopId", "clientId");

-- CreateIndex
CREATE INDEX "Product_shopId_needsReview_idx" ON "Product"("shopId", "needsReview");
