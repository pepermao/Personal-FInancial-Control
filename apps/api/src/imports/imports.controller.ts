import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { ImportCsvDto } from './dto/import-csv.dto';

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
}
