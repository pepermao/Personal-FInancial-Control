import { IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { AssetType, ProfitRateType } from '@ledger/shared';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(AssetType)
  type!: AssetType;

  @IsNumberString()
  value!: string;

  @IsOptional()
  @IsEnum(ProfitRateType)
  profitRateType?: ProfitRateType;

  @IsOptional()
  @IsNumberString()
  profitRate?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
