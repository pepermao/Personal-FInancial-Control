-- CreateEnum
CREATE TYPE "ProfitRateType" AS ENUM ('PREFIXADO', 'CDI_PERCENTAGE', 'IPCA_PLUS', 'SELIC_PLUS', 'POUPANCA', 'NONE');

-- AlterEnum
BEGIN;
CREATE TYPE "AssetType_new" AS ENUM ('CDB', 'LCI', 'LCA', 'TESOURO_SELIC', 'TESOURO_IPCA', 'TESOURO_PREFIXADO', 'POUPANCA', 'ACOES', 'FII', 'REAL_ESTATE', 'OTHER');
ALTER TABLE "assets" ALTER COLUMN "type" TYPE "AssetType_new" USING ("type"::text::"AssetType_new");
ALTER TYPE "AssetType" RENAME TO "AssetType_old";
ALTER TYPE "AssetType_new" RENAME TO "AssetType";
DROP TYPE "AssetType_old";
COMMIT;

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "profitRate" DECIMAL(6,2),
ADD COLUMN     "profitRateType" "ProfitRateType" NOT NULL DEFAULT 'NONE';

