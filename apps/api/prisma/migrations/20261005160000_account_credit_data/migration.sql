-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "creditLimit" DECIMAL(14,2),
ADD COLUMN     "availableCreditLimit" DECIMAL(14,2),
ADD COLUMN     "creditDueDate" TIMESTAMP(3);
