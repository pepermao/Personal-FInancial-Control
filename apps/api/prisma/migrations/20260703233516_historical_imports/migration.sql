-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "endBalance" DECIMAL(14,2),
ADD COLUMN     "historical" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "impactsAccountBalance" BOOLEAN NOT NULL DEFAULT true;
