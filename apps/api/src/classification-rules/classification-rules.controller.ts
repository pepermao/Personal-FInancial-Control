import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClassificationRulesService } from './classification-rules.service';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';

@Controller('classification-rules')
export class ClassificationRulesController {
  constructor(private readonly rulesService: ClassificationRulesService) {}

  @Get()
  findAll() {
    return this.rulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rulesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClassificationRuleDto) {
    return this.rulesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassificationRuleDto) {
    return this.rulesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }
}
