import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AccountsModule } from '../accounts/accounts.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AccountsModule, AssetsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
