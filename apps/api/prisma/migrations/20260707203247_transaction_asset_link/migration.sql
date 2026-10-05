-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "assetId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_assetId_idx" ON "transactions"("assetId");

-- CreateIndex
CREATE INDEX "transactions_nature_idx" ON "transactions"("nature");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
