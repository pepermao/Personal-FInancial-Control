import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { BanksModule } from './banks/banks.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { ClassificationRulesModule } from './classification-rules/classification-rules.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AssetsModule } from './assets/assets.module';
import { ImportsModule } from './imports/imports.module';
import { OpenFinanceModule } from './open-finance/open-finance.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    BanksModule,
    AccountsModule,
    CategoriesModule,
    ClassificationRulesModule,
    TransactionsModule,
    AssetsModule,
    ImportsModule,
    OpenFinanceModule,
    DashboardModule,
  ],
})
export class AppModule {}
