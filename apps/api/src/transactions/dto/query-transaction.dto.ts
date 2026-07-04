import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Direction, TransactionNature, TransactionType } from '@ledger/shared';

export class QueryTransactionDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  competenceMonth?: string;

  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionNature)
  nature?: TransactionNature;

  @IsOptional()
  @IsString()
  search?: string;
}
