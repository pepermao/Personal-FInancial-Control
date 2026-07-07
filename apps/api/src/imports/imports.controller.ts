import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { ImportCsvDto } from './dto/import-csv.dto';
import { BulkImportCsvDto } from './dto/bulk-import-csv.dto';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportCsvDto,
  ) {
    if (!file) throw new BadRequestException('CSV file is required');
    return this.importsService.importCsv(
      dto.accountId,
      file.originalname,
      file.buffer,
      dto.initialBalance,
      dto.endBalance,
    );
  }

  @Post('csv/bulk')
  @UseInterceptors(FilesInterceptor('files', 50))
  async importCsvBulk(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: BulkImportCsvDto,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('At least one CSV file is required');
    if (files.length > 1 && (dto.initialBalance !== undefined || dto.endBalance !== undefined)) {
      throw new BadRequestException(
        'initialBalance/endBalance are only supported when uploading a single file',
      );
    }
    // Sort by filename so users get deterministic ordering; historical detection uses
    // per-file tx dates, so oldest statements always land as historical against newer ones.
    const sorted = [...files].sort((a, b) => a.originalname.localeCompare(b.originalname));
    const results = [];
    for (const file of sorted) {
      try {
        const result = await this.importsService.importCsv(
          dto.accountId,
          file.originalname,
          file.buffer,
          files.length === 1 ? dto.initialBalance : undefined,
          files.length === 1 ? dto.endBalance : undefined,
        );
        results.push({ filename: file.originalname, ok: true, ...result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ filename: file.originalname, ok: false, error: message });
      }
    }
    return { results };
  }
}
