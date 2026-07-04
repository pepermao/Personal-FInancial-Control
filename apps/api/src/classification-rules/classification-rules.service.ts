import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';

@Injectable()
export class ClassificationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.classificationRule.findMany({
      include: { category: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.classificationRule.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!rule) throw new NotFoundException(`Classification rule ${id} not found`);
    return rule;
  }

  /** All active rules ordered by priority, used by the CSV import pipeline. */
  findActiveOrderedByPriority() {
    return this.prisma.classificationRule.findMany({
      where: { active: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateClassificationRuleDto) {
    return this.prisma.classificationRule.create({ data: dto });
  }

  async update(id: string, dto: UpdateClassificationRuleDto) {
    await this.findOne(id);
    return this.prisma.classificationRule.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.classificationRule.delete({ where: { id } });
  }
}
