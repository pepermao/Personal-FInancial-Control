-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'OTHER');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "initialBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'CHECKING';
