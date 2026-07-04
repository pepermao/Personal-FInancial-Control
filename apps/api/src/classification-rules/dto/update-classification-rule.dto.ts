import { PartialType } from '@nestjs/mapped-types';
import { CreateClassificationRuleDto } from './create-classification-rule.dto';

export class UpdateClassificationRuleDto extends PartialType(CreateClassificationRuleDto) {}
