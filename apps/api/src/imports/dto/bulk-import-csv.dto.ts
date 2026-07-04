import { IsUUID } from 'class-validator';

export class BulkImportCsvDto {
  @IsUUID()
  accountId!: string;
}
