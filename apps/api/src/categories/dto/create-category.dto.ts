import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryKind } from '@kevin/shared';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
