import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class ImportCsvDto {
  @IsUUID()
  accountId!: string;

  /** Opening balance for the statement's period. If provided, replaces the account's initialBalance. */
  @IsOptional()
  @IsNumberString()
  initialBalance?: string;

  /** Closing balance for the statement's period, recorded for reference when the statement predates existing data. */
  @IsOptional()
  @IsNumberString()
  endBalance?: string;
}
