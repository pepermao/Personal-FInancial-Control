import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SyncPluggyDto {
  /** How far back to pull. Open Finance caps history at 12 months. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  /** Overrides PLUGGY_ITEM_IDS for a one-off sync of specific items. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];
}
