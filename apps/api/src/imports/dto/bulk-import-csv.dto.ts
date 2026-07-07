import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class BulkImportCsvDto {
  @IsUUID()
  accountId!: string;

  /** Only honored when exactly one file is uploaded. */
  @IsOptional()
  @IsNumberString()
  initialBalance?: string;

  /** Only honored when exactly one file is uploaded. */
  @IsOptional()
  @IsNumberString()
  endBalance?: string;
}
