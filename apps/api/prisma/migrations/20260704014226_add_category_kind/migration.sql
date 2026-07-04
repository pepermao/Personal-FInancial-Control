-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'REIMBURSEMENT');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "kind" "CategoryKind" NOT NULL DEFAULT 'EXPENSE';
