import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ClassificationRulesModule } from '../classification-rules/classification-rules.module';

@Module({
  imports: [ClassificationRulesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
