-- CreateTable
CREATE TABLE "pluggy_connections" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "connectorId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pluggy_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_connections_itemId_key" ON "pluggy_connections"("itemId");
