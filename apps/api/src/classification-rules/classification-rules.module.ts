import { Module } from '@nestjs/common';
import { ClassificationRulesController } from './classification-rules.controller';
import { ClassificationRulesService } from './classification-rules.service';

@Module({
  controllers: [ClassificationRulesController],
  providers: [ClassificationRulesService],
  exports: [ClassificationRulesService],
})
export class ClassificationRulesModule {}
