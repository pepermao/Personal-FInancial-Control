-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "pluggyAccountId" TEXT,
ADD COLUMN     "pluggyItemId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "pluggyTransactionId" TEXT;

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "pluggyInvestmentId" TEXT,
ADD COLUMN     "issuer" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_pluggyAccountId_key" ON "accounts"("pluggyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_pluggyTransactionId_key" ON "transactions"("pluggyTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_pluggyInvestmentId_key" ON "assets"("pluggyInvestmentId");
