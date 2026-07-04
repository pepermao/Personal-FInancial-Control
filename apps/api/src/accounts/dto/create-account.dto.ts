import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountType } from '@ledger/shared';

export class CreateAccountDto {
  @IsUUID()
  bankId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsNumberString()
  initialBalance?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
