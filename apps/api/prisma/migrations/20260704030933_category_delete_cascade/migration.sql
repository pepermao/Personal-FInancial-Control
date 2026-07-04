-- DropForeignKey
ALTER TABLE "classification_rules" DROP CONSTRAINT "classification_rules_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "classification_rules" ADD CONSTRAINT "classification_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
