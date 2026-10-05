-- Drop REAL_ESTATE from AssetType.
--
-- Postgres cannot remove a value from an enum in place, so the type is rebuilt and the
-- column recast. Safe because no row uses the value; the cast would fail loudly if one did.

-- AlterEnum
ALTER TYPE "AssetType" RENAME TO "AssetType_old";

CREATE TYPE "AssetType" AS ENUM ('CDB', 'LCI', 'LCA', 'TESOURO_SELIC', 'TESOURO_IPCA', 'TESOURO_PREFIXADO', 'POUPANCA', 'ACOES', 'FII', 'OTHER');

ALTER TABLE "assets" ALTER COLUMN "type" TYPE "AssetType" USING ("type"::text::"AssetType");

DROP TYPE "AssetType_old";
