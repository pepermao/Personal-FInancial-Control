import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BanksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bank.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({ where: { id } });
    if (!bank) throw new NotFoundException(`Bank ${id} not found`);
    return bank;
  }

  create(dto: CreateBankDto) {
    return this.prisma.bank.create({ data: dto });
  }

  async update(id: string, dto: UpdateBankDto) {
    await this.findOne(id);
    return this.prisma.bank.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.bank.delete({ where: { id } });
  }
}
