import { IsOptional, Matches } from 'class-validator';

export class DashboardSummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month?: string;

  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'year must be in YYYY format' })
  year?: string;
}
