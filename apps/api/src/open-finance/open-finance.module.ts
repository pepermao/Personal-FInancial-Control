import { Module } from '@nestjs/common';
import { OpenFinanceController } from './open-finance.controller';
import { OpenFinanceService } from './open-finance.service';
import { PluggyClient } from './pluggy.client';
import { PluggyConnectionsService } from './pluggy-connections.service';
import { ClassificationRulesModule } from '../classification-rules/classification-rules.module';

@Module({
  imports: [ClassificationRulesModule],
  controllers: [OpenFinanceController],
  providers: [OpenFinanceService, PluggyClient, PluggyConnectionsService],
  exports: [OpenFinanceService, PluggyConnectionsService],
})
export class OpenFinanceModule {}
