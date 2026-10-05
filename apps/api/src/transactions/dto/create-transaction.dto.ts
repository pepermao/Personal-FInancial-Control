import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Direction, TransactionNature, TransactionType } from '@kevin/shared';

export class CreateTransactionDto {
  @IsUUID()
  accountId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  competenceMonth!: string;

  @IsString()
  @IsNotEmpty()
  descriptionRaw!: string;

  @IsOptional()
  @IsString()
  descriptionNormalized?: string;

  @IsNumberString()
  amount!: string;

  @IsEnum(Direction)
  direction!: Direction;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsEnum(TransactionNature)
  nature?: TransactionNature;

  @IsOptional()
  @IsBoolean()
  impactsDashboardIncome?: boolean;

  @IsOptional()
  @IsBoolean()
  impactsDashboardExpense?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
