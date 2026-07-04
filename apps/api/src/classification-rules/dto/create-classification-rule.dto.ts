import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClassificationRuleDto {
  @IsString()
  @IsNotEmpty()
  pattern!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
